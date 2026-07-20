"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { MapPin, Search, Plus, Pencil, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { TUNISIA_CITIES } from "@/lib/geo";

interface AdminField {
  id: string;
  name: string;
  city: string;
  address: string;
  rating: number;
  review_count: number;
  is_active: boolean;
  price_range: string | null;
}

interface FieldForm {
  id?: string;
  name: string;
  city: string;
  address: string;
  latitude: string;
  longitude: string;
  description: string;
  phone: string;
  price_range: string;
  surface_type: string;
  dimensions: string;
  is_indoor: boolean;
  is_active: boolean;
  photos: string;
  has_parking: boolean;
  has_changing_rooms: boolean;
  has_showers: boolean;
  has_lockers: boolean;
  has_lighting: boolean;
  has_cafeteria: boolean;
  has_toilets: boolean;
  has_equipment_rental: boolean;
  has_wifi: boolean;
  has_accessibility: boolean;
}

const AMENITY_FIELDS: { key: keyof FieldForm; label: string }[] = [
  { key: "has_parking", label: "Parking" },
  { key: "has_changing_rooms", label: "Changing Rooms" },
  { key: "has_showers", label: "Showers" },
  { key: "has_lockers", label: "Lockers" },
  { key: "has_lighting", label: "Lighting" },
  { key: "has_cafeteria", label: "Cafeteria" },
  { key: "has_toilets", label: "Toilets" },
  { key: "has_equipment_rental", label: "Equipment Rental" },
  { key: "has_wifi", label: "WiFi" },
  { key: "has_accessibility", label: "Accessibility" },
];

const EMPTY_FORM: FieldForm = {
  name: "", city: TUNISIA_CITIES[0], address: "", latitude: "", longitude: "",
  description: "", phone: "", price_range: "", surface_type: "", dimensions: "",
  is_indoor: false, is_active: true, photos: "",
  has_parking: false, has_changing_rooms: false, has_showers: false, has_lockers: false,
  has_lighting: false, has_cafeteria: false, has_toilets: false, has_equipment_rental: false,
  has_wifi: false, has_accessibility: false,
};

export default function AdminFieldsPage() {
  const [fields, setFields] = useState<AdminField[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FieldForm | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (searchInput) params.set("q", searchInput);
    fetch(`/api/admin/fields?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load fields");
        return r.json();
      })
      .then((data) => setFields(data.fields))
      .catch(() => setError("Failed to load fields."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const handle = setTimeout(load, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function openCreate() {
    setForm({ ...EMPTY_FORM });
  }

  async function openEdit(id: string) {
    const res = await fetch(`/api/admin/fields/${id}`);
    if (!res.ok) { toast.error("Failed to load field"); return; }
    const f = await res.json();
    setForm({
      id: f.id,
      name: f.name ?? "",
      city: f.city ?? TUNISIA_CITIES[0],
      address: f.address ?? "",
      latitude: f.latitude?.toString() ?? "",
      longitude: f.longitude?.toString() ?? "",
      description: f.description ?? "",
      phone: f.phone ?? "",
      price_range: f.price_range ?? "",
      surface_type: f.surface_type ?? "",
      dimensions: f.dimensions ?? "",
      is_indoor: !!f.is_indoor,
      is_active: f.is_active !== false,
      photos: (f.photos ?? []).join("\n"),
      has_parking: !!f.has_parking,
      has_changing_rooms: !!f.has_changing_rooms,
      has_showers: !!f.has_showers,
      has_lockers: !!f.has_lockers,
      has_lighting: !!f.has_lighting,
      has_cafeteria: !!f.has_cafeteria,
      has_toilets: !!f.has_toilets,
      has_equipment_rental: !!f.has_equipment_rental,
      has_wifi: !!f.has_wifi,
      has_accessibility: !!f.has_accessibility,
    });
  }

  async function save() {
    if (!form) return;
    if (!form.name.trim() || !form.address.trim()) {
      toast.error("Name and address are required");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      city: form.city,
      address: form.address,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      description: form.description || null,
      phone: form.phone || null,
      price_range: form.price_range || null,
      surface_type: form.surface_type || null,
      dimensions: form.dimensions || null,
      is_indoor: form.is_indoor,
      is_active: form.is_active,
      photos: form.photos.split("\n").map((s) => s.trim()).filter(Boolean),
      has_parking: form.has_parking,
      has_changing_rooms: form.has_changing_rooms,
      has_showers: form.has_showers,
      has_lockers: form.has_lockers,
      has_lighting: form.has_lighting,
      has_cafeteria: form.has_cafeteria,
      has_toilets: form.has_toilets,
      has_equipment_rental: form.has_equipment_rental,
      has_wifi: form.has_wifi,
      has_accessibility: form.has_accessibility,
    };
    const res = await fetch(form.id ? `/api/admin/fields/${form.id}` : "/api/admin/fields", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Save failed");
      return;
    }
    toast.success(form.id ? "Field updated" : "Field created");
    setForm(null);
    load();
  }

  async function deactivate(id: string) {
    if (!confirm("Deactivate this field? It will be hidden from discovery but history is preserved.")) return;
    const res = await fetch(`/api/admin/fields/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to deactivate"); return; }
    toast.success("Field deactivated");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">Football Fields</h1>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Add field</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search fields…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : fields.length === 0 ? (
        <EmptyState icon={MapPin} title="No fields found" action={{ label: "Add field", onClick: openCreate }} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.name}</TableCell>
                <TableCell className="text-muted-foreground">{f.city}</TableCell>
                <TableCell>
                  {f.rating > 0 ? (
                    <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500" />{f.rating.toFixed(1)} ({f.review_count})</span>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{f.price_range ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={f.is_active ? "default" : "outline"}>{f.is_active ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(f.id)}><Pencil className="h-4 w-4" /></Button>
                    {f.is_active && (
                      <Button variant="ghost" size="icon-sm" onClick={() => deactivate(f.id)}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit field" : "Add field"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <select
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {TUNISIA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Price range</Label>
                  <Input value={form.price_range} onChange={(e) => setForm({ ...form, price_range: e.target.value })} placeholder="e.g. 30-50 TND" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Latitude</Label>
                  <Input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Longitude</Label>
                  <Input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Surface</Label>
                  <Input value={form.surface_type} onChange={(e) => setForm({ ...form, surface_type: e.target.value })} placeholder="e.g. Artificial turf" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Photo URLs (one per line)</Label>
                  <Textarea value={form.photos} onChange={(e) => setForm({ ...form, photos: e.target.value })} rows={2} />
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Amenities</p>
                <div className="grid grid-cols-2 gap-2">
                  {AMENITY_FIELDS.map((a) => (
                    <label key={a.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(form[a.key])}
                        onChange={(e) => setForm({ ...form, [a.key]: e.target.checked })}
                      />
                      {a.label}
                    </label>
                  ))}
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.is_indoor} onChange={(e) => setForm({ ...form, is_indoor: e.target.checked })} />
                    Indoor
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                    Active (visible to players)
                  </label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
