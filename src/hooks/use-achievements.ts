"use client";

import { useQuery } from "@tanstack/react-query";

export interface PlayerAchievement {
  id: string;
  player_id: string;
  achievement_type: string;
  achievement_name: string;
  unlocked_at: string;
  match_id: string | null;
}

export const ALL_ACHIEVEMENTS: { type: string; name: string; icon: string; description: string }[] = [
  { type: "first_match", name: "First Match", icon: "⚽", description: "Played your first match" },
  { type: "first_goal", name: "First Goal", icon: "🥅", description: "Scored your first goal" },
  { type: "matches_10", name: "10 Matches", icon: "🏃", description: "Played 10 matches" },
  { type: "matches_25", name: "25 Matches", icon: "💪", description: "Played 25 matches" },
  { type: "hat_trick", name: "Hat-Trick", icon: "🎩", description: "Scored 3+ goals in a single match" },
  { type: "motm_5", name: "MOTM x5", icon: "🏆", description: "Won 5 Man of the Match awards" },
  { type: "community_favorite", name: "Community Favorite", icon: "❤️", description: "Avg rating 4.5+ with 5+ reviews" },
  { type: "reliable_player", name: "Reliable Player", icon: "🤝", description: "90%+ completion rate over 5 matches" },
  { type: "top_organizer", name: "Top Organizer", icon: "📋", description: "Organized 10+ matches" },
];

async function fetchAchievements(playerId: string): Promise<PlayerAchievement[]> {
  const res = await fetch(`/api/achievements?playerId=${playerId}`);
  if (!res.ok) throw new Error("Failed to fetch achievements");
  return res.json();
}

export function usePlayerAchievements(playerId: string | null) {
  return useQuery({
    queryKey: ["achievements", playerId],
    queryFn: () => fetchAchievements(playerId!),
    enabled: !!playerId,
    staleTime: 30_000,
  });
}
