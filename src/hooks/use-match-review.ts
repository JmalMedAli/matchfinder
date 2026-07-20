"use client";

import { useQuery } from "@tanstack/react-query";

export interface MatchReview {
  id: string;
  overall_rating: number;
  comment: string | null;
}

async function fetchMyMatchReview(matchId: string): Promise<MatchReview | null> {
  const res = await fetch(`/api/matches/${matchId}/post-review`);
  if (!res.ok) throw new Error("Failed to fetch match review");
  return res.json();
}

export function useMyMatchReview(matchId: string) {
  return useQuery({
    queryKey: ["match-review", matchId],
    queryFn: () => fetchMyMatchReview(matchId),
    enabled: !!matchId,
  });
}
