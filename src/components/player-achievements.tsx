"use client";

import { usePlayerAchievements, ALL_ACHIEVEMENTS } from "@/hooks/use-achievements";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";

interface PlayerAchievementsProps {
  playerId: string;
  compact?: boolean;
}

export function PlayerAchievements({ playerId, compact }: PlayerAchievementsProps) {
  const { data: achievements, isPending } = usePlayerAchievements(playerId);

  if (isPending) {
    return (
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 w-16 rounded-xl bg-muted animate-pulse shrink-0" />
        ))}
      </div>
    );
  }

  const unlocked = new Set((achievements ?? []).map((a) => a.achievement_type));

  if (compact) {
    const unlockedList = ALL_ACHIEVEMENTS.filter((a) => unlocked.has(a.type));
    if (unlockedList.length === 0) return null;

    return (
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
        {unlockedList.map((ach, i) => (
          <motion.div
            key={ach.type}
            className="shrink-0 flex items-center gap-2 bg-amber-500/5 border border-amber-500/15 rounded-xl px-3 py-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <span className="text-lg">{ach.icon}</span>
            <span className="text-xs font-medium">{ach.name}</span>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-500" />
        <p className="text-sm font-semibold">Achievements</p>
        <span className="text-xs text-muted-foreground">
          {unlocked.size}/{ALL_ACHIEVEMENTS.length}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {ALL_ACHIEVEMENTS.map((ach, i) => {
          const isUnlocked = unlocked.has(ach.type);
          return (
            <motion.div
              key={ach.type}
              className={`rounded-xl p-3 text-center border transition-all ${
                isUnlocked
                  ? "bg-amber-500/5 border-amber-500/20"
                  : "bg-muted/30 border-border/50 opacity-50"
              }`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: isUnlocked ? 1 : 0.5, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
            >
              <span className="text-2xl block mb-1">{ach.icon}</span>
              <p className="text-[10px] font-semibold leading-tight">{ach.name}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{ach.description}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
