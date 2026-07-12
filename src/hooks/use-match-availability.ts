"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface MatchAvailability {
  id: string;
  match_id: string;
  user_id: string;
  status: "available" | "maybe" | "unavailable";
  note: string | null;
  created_at: string;
  profiles?: { name: string | null; image: string | null };
}

async function fetchAvailability(matchId: string): Promise<MatchAvailability[]> {
  const res = await fetch(`/api/match-availability?matchId=${matchId}`);
  if (!res.ok) throw new Error("Failed to fetch availability");
  return res.json();
}

async function setAvailability(data: {
  matchId: string;
  status: string;
  note?: string;
}): Promise<MatchAvailability> {
  const res = await fetch("/api/match-availability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to set availability");
  }
  return res.json();
}

export function useMatchAvailability(matchId: string) {
  return useQuery({
    queryKey: ["match-availability", matchId],
    queryFn: () => fetchAvailability(matchId),
    enabled: !!matchId,
  });
}

export function useSetAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setAvailability,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["match-availability", variables.matchId] });
    },
  });
}
