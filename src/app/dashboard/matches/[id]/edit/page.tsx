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
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { FootballFieldSelector } from "@/components/football-field-selector";
import type { FootballField } from "@/types/football-field";
import { ArrowLeft, Calendar, Clock, Users, FileText } from "lucide-react";
import { motion } from "framer-motion";

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

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
    }
  }, [match]);

  useEffect(() => {
    if (existingField) setField(existingField);
  }, [existingField]);

  if (isPending) {
    return <Skeleton className="h-64 rounded-2xl max-w-lg" />;
  }

  if (!match) {
    return <p className="text-muted-foreground">Match not found.</p>;
  }

  if (userId !== match.organizer_id) {
    return <p className="text-muted-foreground">You are not the organizer of this match.</p>;
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
      className="space-y-6 max-w-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link href={`/dashboard/matches/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to match
      </Link>

      <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">
        Edit match
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  Title
                </Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Date
                  </Label>
                  <Input id="date" type="date" value={date} min={new Date().toISOString().split("T")[0]} onChange={(e) => setDate(e.target.value)} required className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time" className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Time
                  </Label>
                  <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required className="h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Football Field</Label>
                <FootballFieldSelector
                  value={field}
                  onSelect={setField}
                  onClear={() => setField(null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPlayers" className="flex items-center gap-1.5">
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
                  className="h-11"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="flex gap-3"
          custom={2}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div whileHover={isFormValid ? { scale: 1.02 } : undefined} whileTap={isFormValid ? { scale: 0.97 } : undefined}>
            <Button type="submit" disabled={updateMatch.isPending || !isFormValid} className="h-11">
              {updateMatch.isPending ? "Saving..." : "Save changes"}
            </Button>
          </motion.div>
          <Button type="button" variant="outline" onClick={() => router.back()} className="h-11">
            Cancel
          </Button>
        </motion.div>
      </form>
    </motion.div>
  );
}
