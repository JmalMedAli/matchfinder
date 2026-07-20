"use client";

import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Star, Shield } from "lucide-react";
import { motion } from "framer-motion";

interface LeaderboardPlayer {
  id: string;
  name: string | null;
  image: string | null;
  position: string | null;
  matches_played: number;
  matches_organized: number;
  avg_rating: number;
  review_count: number;
}

async function fetchLeaderboard(): Promise<LeaderboardPlayer[]> {
  const res = await fetch("/api/leaderboard");
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json();
}

const rankColors = ["bg-amber-400", "bg-gray-300", "bg-amber-600"];
const rankIcons = ["🏆", "🥈", "🥉"];

export function PlayerLeaderboard() {
  const { data: players, isPending, error, refetch } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
    staleTime: 60_000,
  });

  if (isPending) {
    return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load the leaderboard</p>
        <button onClick={() => refetch()} className="text-xs text-primary font-medium mt-1">Try again</button>
      </div>
    );
  }

  if (!players?.length) return <p className="text-center text-sm text-muted-foreground py-8">No players yet</p>;

  return (
    <div className="space-y-2">
      {players.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`flex items-center gap-3 p-3 rounded-2xl border ${i < 3 ? "bg-primary/5 border-primary/20" : "bg-card"}`}
        >
          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${i < 3 ? rankColors[i] : "bg-muted"}`}>
            {i < 3 ? rankIcons[i] : i + 1}
          </div>
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={p.image ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{p.name?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{p.name ?? "Unknown"}</p>
            <p className="text-xs text-muted-foreground">{p.position ?? "No position"}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-center">
              <p className="text-sm font-bold">{p.matches_played}</p>
              <p className="text-[10px] text-muted-foreground">Played</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold">{p.matches_organized}</p>
              <p className="text-[10px] text-muted-foreground">Organized</p>
            </div>
            {p.review_count > 0 && (
              <div className="text-center">
                <div className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  <p className="text-sm font-bold">{p.avg_rating}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">{p.review_count} reviews</p>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
