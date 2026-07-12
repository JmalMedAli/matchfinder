"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface MatchPhoto {
  id: string;
  match_id: string;
  user_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  profiles?: { name: string | null; image: string | null };
  _publicUrl?: string;
}

async function fetchMatchPhotos(matchId: string): Promise<MatchPhoto[]> {
  const res = await fetch(`/api/match-photos?matchId=${matchId}`);
  if (!res.ok) throw new Error("Failed to fetch photos");
  return res.json();
}

export function useMatchPhotos(matchId: string) {
  return useQuery({
    queryKey: ["match-photos", matchId],
    queryFn: () => fetchMatchPhotos(matchId),
    enabled: !!matchId,
  });
}
