"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface AppSettings {
  maintenance_mode: boolean;
  support_email: string | null;
  default_search_radius_km: number;
  default_max_players: number;
  default_price_per_person: number | null;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function fetchSettings() {
    return fetch("/api/admin/settings")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load settings");
        return r.json();
      })
      .then(setSettings)
      .catch(() => setError("Failed to load settings."))
      .finally(() => setLoading(false));
  }

  function reload() {
    setLoading(true);
    setError(null);
    fetchSettings();
  }

  useEffect(() => { fetchSettings(); }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Save failed");
      return;
    }
    toast.success("Settings saved");
  }

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-40" /><Skeleton className="h-80 rounded-2xl" /></div>;
  }

  if (error || !settings) {
    return <ErrorState description={error ?? "Failed to load settings."} onRetry={reload} />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">Settings</h1>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className={`flex items-start gap-3 p-3 rounded-xl ${settings.maintenance_mode ? "bg-destructive/10" : "bg-muted"}`}>
            <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${settings.maintenance_mode ? "text-destructive" : "text-muted-foreground"}`} />
            <div className="flex-1">
              <p className="text-sm font-medium">Maintenance mode</p>
              <p className="text-xs text-muted-foreground">
                When on, non-admin players see a maintenance screen instead of the dashboard.
              </p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenance_mode}
                onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                className="sr-only peer"
              />
              <span className="h-6 w-11 rounded-full bg-muted peer-checked:bg-destructive relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
            </label>
          </div>

          <div className="space-y-1.5">
            <Label>Support email</Label>
            <Input
              type="email"
              value={settings.support_email ?? ""}
              onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
              placeholder="support@matchfinder.tn"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Default search radius (km)</Label>
              <Input
                type="number"
                value={settings.default_search_radius_km}
                onChange={(e) => setSettings({ ...settings, default_search_radius_km: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Default max players</Label>
              <Input
                type="number"
                value={settings.default_max_players}
                onChange={(e) => setSettings({ ...settings, default_max_players: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Default price per person (TND)</Label>
              <Input
                type="number"
                value={settings.default_price_per_person ?? ""}
                onChange={(e) => setSettings({ ...settings, default_price_per_person: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          </div>

          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
