"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseTypingIndicatorOptions {
  conversationId: string;
  userId: string;
  enabled?: boolean;
}

interface TypingEvent {
  user_id: string;
  name: string;
}

export function useTypingIndicator({
  conversationId,
  userId,
  enabled = true,
}: UseTypingIndicatorOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !conversationId) return;

    let cancelled = false;

    try {
      const supabase = createClient();
      const ch = supabase.channel(`typing:${conversationId}`);

      ch.on("broadcast", { event: "typing" }, ({ payload }: { payload: TypingEvent }) => {
        if (!cancelled && payload.user_id !== userId) {
          setTypingUsers((prev) => {
            if (prev.includes(payload.name)) return prev;
            return [...prev, payload.name];
          });
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter((n) => n !== payload.name));
          }, 3000);
        }
      });

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
  }, [conversationId, userId, enabled]);

  const broadcastTyping = useCallback(
    (name: string) => {
      if (!channelRef.current) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { user_id: userId, name },
      });
    },
    [userId],
  );

  return { typingUsers, broadcastTyping };
}
