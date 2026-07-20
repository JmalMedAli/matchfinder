"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { FootballFieldSelector } from "@/components/football-field-selector";
import { useFootballField } from "@/hooks/use-football-fields";
import type { FootballField } from "@/types/football-field";
import { toast } from "sonner";
import {
  ArrowLeft, Calendar, Clock, Users, FileText, Save, DollarSign,
  CheckCircle, XCircle, RotateCcw,
} from "lucide-react";
import { motion } from "framer-motion";

const POSITIONS = ["", "Goalkeeper", "Defender", "Midfielder", "Forward"];
const STATUSES = ["OPEN", "FULL", "CLOSED", "COMPLETED", "ARCHIVED"] as const;

interface AdminMatchDetail {
  id: string;
  title: string;
  description: string | null;
  date: string;
  status: string;
  max_players: number;
  football_field_id: string | null;
  position_needed: string | null;
  price_per_person: number | null;
  profiles: { name: string | null; image: string | null } | null;
  join_requests: JoinRequestRow[];
}

interface JoinRequestRow {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  created_at: string;
  player_id: string;
  profiles: { name: string | null; image: string | null; city: string | null; position: string | null } | null;
}

export default function AdminMatchEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [match, setMatch] = useState<AdminMatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [field, setField] = useState<FootballField | null>(null);
  const [maxPlayers, setMaxPlayers] = useState("14");
  const [positionNeeded, setPositionNeeded] = useState("");
  const [pricePerPerson, setPricePerPerson] = useState("");
  const [status, setStatus] = useState<string>("OPEN");

  const { data: existingField } = useFootballField(match?.football_field_id ?? null);

  function load() {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/matches/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load match");
        return r.json();
      })
      .then((data: AdminMatchDetail) => {
        setMatch(data);
        setTitle(data.title);
        setDescription(data.description ?? "");
        const d = new Date(data.date);
        setDate(d.toISOString().split("T")[0]);
        setTime(d.toTimeString().slice(0, 5));
        setMaxPlayers(String(data.max_players));
        setPositionNeeded(data.position_needed ?? "");
        setPricePerPerson(data.price_per_person ? String(data.price_per_person) : "");
        setStatus(data.status);
      })
      .catch(() => setError("Failed to load match."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const handle = setTimeout(load, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!existingField) return;
    const handle = setTimeout(() => setField(existingField), 0);
    return () => clearTimeout(handle);
  }, [existingField]);

  async function saveDetails() {
    const dateTime = new Date(`${date}T${time}:00`);
    setSaving(true);
    const res = await fetch(`/api/admin/matches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || null,
        date: dateTime.toISOString(),
        footballFieldId: field?.id ?? null,
        maxPlayers: parseInt(maxPlayers, 10),
        positionNeeded: positionNeeded || null,
        pricePerPerson: pricePerPerson ? parseFloat(pricePerPerson) : null,
        status,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Save failed");
      return;
    }
    toast.success("Match updated");
    load();
  }

  async function setRequestStatus(requestId: string, newStatus: "PENDING" | "ACCEPTED" | "REJECTED") {
    const res = await fetch(`/api/admin/matches/${id}/join-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Action failed");
      return;
    }
    toast.success("Request updated");
    load();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !match) {
    return <ErrorState description={error ?? "Match not found."} onRetry={load} />;
  }

  const isFormValid = title && date && time && maxPlayers;

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/admin/matches"
          className="h-9 w-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)]">Edit match</h1>
          <p className="text-xs text-muted-foreground">Organized by {match.profiles?.name ?? "Unknown"}</p>
        </div>
      </div>

      {/* ── Details form ── */}
      <div className="bg-card border rounded-2xl p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title" className="flex items-center gap-1.5 text-sm">
            <FileText className="h-3.5 w-3.5 text-primary" />
            Title
          </Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="h-12 text-base" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm">Description</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="text-base resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-1.5 text-sm">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Date
            </Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="h-12 text-base" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time" className="flex items-center gap-1.5 text-sm">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Time
            </Label>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required className="h-12 text-base" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Football Field</Label>
          <FootballFieldSelector value={field} onSelect={setField} onClear={() => setField(null)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxPlayers" className="flex items-center gap-1.5 text-sm">
            <Users className="h-3.5 w-3.5 text-primary" />
            Max players
          </Label>
          <Input
            id="maxPlayers"
            type="number"
            min={2}
            max={100}
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(e.target.value)}
            required
            className="h-12 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Position needed</Label>
          <div className="flex gap-2 flex-wrap">
            {POSITIONS.map((pos) => (
              <button
                key={pos || "any"}
                type="button"
                onClick={() => setPositionNeeded(pos)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  positionNeeded === pos
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {pos || "Any"}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-sm">
            <DollarSign className="h-3.5 w-3.5 text-primary" />
            Price per person
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">TND</span>
            <Input
              type="number"
              min={0}
              step={0.5}
              placeholder="0 for free"
              value={pricePerPerson}
              onChange={(e) => setPricePerPerson(e.target.value)}
              className="h-12 text-base pl-10"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Status</Label>
          <div className="flex gap-1.5 flex-wrap">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  status === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {match.status !== "OPEN" && status === "OPEN" && (
            <p className="text-xs text-amber-600">
              Reopening will make this match visible and joinable again, even though it was {match.status.toLowerCase()}.
            </p>
          )}
        </div>
      </div>

      <Button onClick={saveDetails} disabled={saving || !isFormValid} className="w-full h-12 rounded-xl font-semibold gap-2">
        {saving ? "Saving…" : (<><Save className="h-4 w-4" /> Save changes</>)}
      </Button>

      {/* ── Join requests ── */}
      <div className="space-y-2.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Join requests ({match.join_requests.length})
        </p>
        {match.join_requests.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 text-center py-6">No requests yet.</p>
        ) : (
          <div className="space-y-2">
            {match.join_requests.map((r) => (
              <div key={r.id} className="bg-card border rounded-2xl p-3.5 flex items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={r.profiles?.image ?? undefined} />
                  <AvatarFallback className="text-xs">{(r.profiles?.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.profiles?.name ?? "Unknown player"}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[r.profiles?.position, r.profiles?.city].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <Badge variant={r.status === "ACCEPTED" ? "default" : r.status === "REJECTED" ? "destructive" : "secondary"} className="shrink-0">
                  {r.status}
                </Badge>
                <div className="flex items-center gap-1 shrink-0">
                  {r.status === "PENDING" && (
                    <>
                      <Button size="icon-sm" variant="ghost" title="Accept" onClick={() => setRequestStatus(r.id, "ACCEPTED")}>
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" title="Reject" onClick={() => setRequestStatus(r.id, "REJECTED")}>
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                  {r.status === "ACCEPTED" && (
                    <Button size="icon-sm" variant="ghost" title="Remove from match" onClick={() => setRequestStatus(r.id, "REJECTED")}>
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                  {r.status === "REJECTED" && (
                    <Button size="icon-sm" variant="ghost" title="Reset to pending" onClick={() => setRequestStatus(r.id, "PENDING")}>
                      <RotateCcw className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
