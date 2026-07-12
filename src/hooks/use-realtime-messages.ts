"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/chat";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeMessagesOptions {
  conversationId: string;
  onMessage: (message: Message) => void;
  enabled?: boolean;
}

export function useRealtimeMessages({
  conversationId,
  onMessage,
  enabled = true,
}: UseRealtimeMessagesOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled || !conversationId) return;

    let cancelled = false;

    try {
      const supabase = createClient();
      const ch = supabase.channel(`messages:${conversationId}`);

      ch.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          if (!cancelled) {
            onMessageRef.current(payload.new as unknown as Message);
          }
        },
      );

      ch.subscribe((s: string) => {
        if (!cancelled && s === "SUBSCRIBED") {
          channelRef.current = ch;
        }
      });

      if (cancelled) {
        supabase.removeChannel(ch);
      }

      return () => {
        cancelled = true;
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      };
    } catch {
      // Supabase not configured
    }
  }, [conversationId, enabled]);
}
