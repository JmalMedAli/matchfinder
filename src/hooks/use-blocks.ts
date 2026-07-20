"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface BlockedUser {
  id: string;
  blocked_id: string;
}

async function fetchBlocks(): Promise<BlockedUser[]> {
  const res = await fetch("/api/blocks");
  if (!res.ok) throw new Error("Failed to fetch blocks");
  return res.json();
}

async function toggleBlock(blockedId: string): Promise<{ action: "blocked" | "unblocked" }> {
  const res = await fetch("/api/blocks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blockedId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to update block");
  }
  return res.json();
}

export function useBlocks() {
  return useQuery({
    queryKey: ["blocks"],
    queryFn: fetchBlocks,
    staleTime: 30_000,
  });
}

export function useToggleBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: toggleBlock,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocks"] }),
  });
}
