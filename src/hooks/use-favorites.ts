"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface FavoritePlayer {
  id: string;
  player_id: string;
  profiles: {
    id: string;
    name: string | null;
    image: string | null;
    position: string | null;
    city: string | null;
  };
}

async function fetchFavorites(): Promise<FavoritePlayer[]> {
  const res = await fetch("/api/favorites");
  if (!res.ok) throw new Error("Failed to fetch favorites");
  return res.json();
}

async function toggleFavorite(playerId: string): Promise<{ action: "added" | "removed" }> {
  const res = await fetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId }),
  });
  if (!res.ok) throw new Error("Failed to toggle favorite");
  return res.json();
}

export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: fetchFavorites,
    staleTime: 30_000,
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: toggleFavorite,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });
}
