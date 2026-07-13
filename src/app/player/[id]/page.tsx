"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Calendar, Trophy } from "lucide-react";
import { motion } from "framer-motion";

async function fetchPlayerStats(id: string) {
  const res = await fetch(`/api/players/${id}/stats`);
  if (!res.ok) throw new Error("Player not found");
  return res.json();
}

async function fetchPlayerProfile(id: string) {
  const res = await fetch(`/api/players/${id}/stats`);
  if (!res.ok) return null;
  const data = await res.json();
  return data;
}

export default function PublicPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: stats, isPending, error } = useQuery({
    queryKey: ["player-public", id],
    queryFn: () => fetchPlayerStats(id),
  });

  if (isPending) return <div className="min-h-screen p-4 space-y-4"><div className="h-32 rounded-2xl bg-muted animate-pulse" /></div>;
  if (error || !stats) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Player not found</p></div>;

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="relative rounded-b-3xl overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-transparent px-4 pt-10 pb-6">
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-24 w-24 ring-4 ring-background shadow-xl">
            <AvatarImage src={stats.image ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-3xl">{stats.name?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)] mt-3">{stats.name ?? "Player"}</h1>
          {stats.position && <p className="text-sm text-muted-foreground">{stats.position}</p>}
          {stats.city && <p className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />{stats.city}</p>}
        </div>
      </div>

      <div className="px-4 mt-6 space-y-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-3">
          <div className="bg-card border rounded-2xl p-3 text-center">
            <Trophy className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold">{stats.matchesPlayed ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Played</p>
          </div>
          <div className="bg-card border rounded-2xl p-3 text-center">
            <Calendar className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold">{stats.matchesOrganized ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Organized</p>
          </div>
          <div className="bg-card border rounded-2xl p-3 text-center">
            <Star className="h-5 w-5 text-amber-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{stats.averageRating ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground">Rating</p>
          </div>
        </motion.div>

        {stats.bio && (
          <div className="bg-card border rounded-2xl p-4">
            <p className="text-sm text-muted-foreground">{stats.bio}</p>
          </div>
        )}
      </div>
    </div>
  );
}
