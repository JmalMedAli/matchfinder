"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMatch, useUpdateMatch } from "@/hooks/use-matches";
import { useFootballField } from "@/hooks/use-football-fields";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { FootballFieldSelector } from "@/components/football-field-selector";
import type { FootballField } from "@/types/football-field";
import { ArrowLeft, Calendar, Clock, Users, FileText, Save } from "lucide-react";
import { motion } from "framer-motion";

const POSITIONS = ["", "Goalkeeper", "Defender", "Midfielder", "Forward"];

export default function EditMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const { data: match, isPending } = useMatch(id);
  const updateMatch = useUpdateMatch();
  const { data: existingField } = useFootballField(match?.football_field_id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [field, setField] = useState<FootballField | null>(null);
  const [maxPlayers, setMaxPlayers] = useState("14");
  const [positionNeeded, setPositionNeeded] = useState("");

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        setUserId(data.user?.id ?? null);
      } catch {
        // Supabase not configured
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    if (match) {
      setTitle(match.title);
      setDescription(match.description ?? "");
      const d = new Date(match.date);
      setDate(d.toISOString().split("T")[0]);
      setTime(d.toTimeString().slice(0, 5));
      setMaxPlayers(String(match.max_players));
      setPositionNeeded(match.position_needed ?? "");
    }
  }, [match]);

  useEffect(() => {
    if (existingField) setField(existingField);
  }, [existingField]);

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <p className="font-medium text-lg">Match not found</p>
        <Link href="/dashboard/my-matches" className="mt-3">
          <Button variant="outline" size="sm">Back to matches</Button>
        </Link>
      </div>
    );
  }

  if (userId !== match.organizer_id) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <p className="text-muted-foreground">You are not the organizer of this match.</p>
        <Link href={`/dashboard/matches/${id}`} className="mt-3">
          <Button variant="outline" size="sm">Back to match</Button>
        </Link>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dateTime = new Date(`${date}T${time}:00`);
    if (dateTime.getTime() <= Date.now()) {
      toast.error("Match date must be in the future");
      return;
    }
    if (!field) {
      toast.error("Please select a football field");
      return;
    }

    updateMatch.mutate(
      {
        id,
        data: {
          title,
          description: description || undefined,
          date: dateTime.toISOString(),
          location: field.name,
          footballFieldId: field.id,
          maxPlayers: parseInt(maxPlayers, 10),
          positionNeeded: positionNeeded || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Match updated!");
          router.push(`/dashboard/matches/${id}`);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  const isFormValid = title && date && time && field && maxPlayers;

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
          href={`/dashboard/matches/${id}`}
          className="h-9 w-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)]">
          Edit match
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Title & Description ── */}
        <div className="bg-card border rounded-2xl p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-1.5 text-sm">
              <FileText className="h-3.5 w-3.5 text-primary" />
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="text-base resize-none"
            />
          </div>
        </div>

        {/* ── Date, Time, Field, Players ── */}
        <div className="bg-card border rounded-2xl p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-1.5 text-sm">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Time
              </Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="h-12 text-base"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Football Field</Label>
            <FootballFieldSelector
              value={field}
              onSelect={setField}
              onClear={() => setField(null)}
            />
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
              max={50}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              required
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Position needed (optional)</Label>
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
        </div>

        {/* ── Actions ── */}
        <div className="sticky bottom-0 pt-2 pb-2 -mx-4 px-4">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="h-12 px-5 rounded-xl font-semibold"
            >
              Cancel
            </Button>
            <motion.div className="flex-1" whileTap={{ scale: 0.97 }}>
              <Button
                type="submit"
                disabled={updateMatch.isPending || !isFormValid}
                className="w-full h-12 rounded-xl font-semibold text-base gap-2"
              >
                {updateMatch.isPending ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save changes
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
