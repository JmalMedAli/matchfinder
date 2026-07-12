"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Review {
  id: string;
  match_id: string;
  reviewer_id: string;
  player_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  match_title?: string;
  reviewer_name?: string;
  reviewer_image?: string;
  profiles?: { name: string | null; image: string | null };
}

export interface PlayerRating {
  average_rating: number;
  review_count: number;
}

async function fetchPlayerReviews(playerId: string): Promise<Review[]> {
  const res = await fetch(`/api/reviews?playerId=${playerId}`);
  if (!res.ok) throw new Error("Failed to fetch reviews");
  return res.json();
}

async function fetchMatchReviews(matchId: string): Promise<Review[]> {
  const res = await fetch(`/api/reviews?matchId=${matchId}`);
  if (!res.ok) throw new Error("Failed to fetch reviews");
  return res.json();
}

async function submitReview(data: {
  matchId: string;
  playerId: string;
  rating: number;
  comment?: string;
}): Promise<Review> {
  const res = await fetch("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to submit review");
  }
  return res.json();
}

export function usePlayerReviews(playerId: string) {
  return useQuery({
    queryKey: ["reviews", "player", playerId],
    queryFn: () => fetchPlayerReviews(playerId),
    enabled: !!playerId,
  });
}

export function useMatchReviews(matchId: string) {
  return useQuery({
    queryKey: ["reviews", "match", matchId],
    queryFn: () => fetchMatchReviews(matchId),
    enabled: !!matchId,
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: submitReview,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["reviews", "player", variables.playerId] });
      qc.invalidateQueries({ queryKey: ["reviews", "match", variables.matchId] });
      qc.invalidateQueries({ queryKey: ["player-stats", variables.playerId] });
    },
  });
}
