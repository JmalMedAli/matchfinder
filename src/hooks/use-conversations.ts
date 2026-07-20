"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Conversation } from "@/types/chat";

async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch("/api/conversations");
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json();
}

async function createDM(targetId: string): Promise<{ conversation_id: string }> {
  const res = await fetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to start conversation");
  }
  return res.json();
}

/** Removes the caller from the given conversations (or all of them if `ids` is omitted) — see the DELETE route for why this doesn't delete the conversation itself. */
async function deleteConversations(ids?: string[]): Promise<void> {
  const res = await fetch("/api/conversations", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to delete conversations");
  }
}

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
  });
}

export function useCreateDM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createDM,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useDeleteConversations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => deleteConversations(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
