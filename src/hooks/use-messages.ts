"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Message } from "@/types/chat";

interface MessagesPage {
  messages: Message[];
  nextCursor: string | null;
}

async function fetchMessages(
  conversationId: string,
  cursor?: string,
): Promise<MessagesPage> {
  const params = new URLSearchParams({ conversationId });
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`/api/messages?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

async function sendMessage(
  conversationId: string,
  content: string,
): Promise<Message> {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, content }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to send message");
  }
  return res.json();
}

export function useMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: ["messages", conversationId],
    queryFn: ({ pageParam }) => fetchMessages(conversationId, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      sendMessage(conversationId, content),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
