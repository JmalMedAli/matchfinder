"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";
export type RealtimeStatus = "connecting" | "connected" | "disconnected";

interface UseRealtimeChannelOptions {
  channel: string;
  table: string;
  event?: RealtimeEvent;
  filter?: string;
  onEvent: (payload: Record<string, unknown>) => void;
  enabled?: boolean;
}

export function useRealtimeChannel({
  channel,
  table,
  event = "*",
  filter,
  onEvent,
  enabled = true,
}: UseRealtimeChannelOptions): { status: RealtimeStatus } {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const [status, setStatus] = useState<RealtimeStatus>("disconnected");

  useEffect(() => {
    if (!enabled) {
      setStatus("disconnected");
      return;
    }

    let cancelled = false;
    setStatus("connecting");

    try {
      const supabase = createClient();

      const ch = supabase.channel(channel);

      ch.on(
        "postgres_changes",
        { event, schema: "public", table, filter },
        (payload: { new: Record<string, unknown> }) => {
          if (!cancelled) onEventRef.current(payload.new);
        },
      );

      ch.subscribe((s: string) => {
        if (cancelled) return;
        if (s === "SUBSCRIBED") {
          channelRef.current = ch;
          setStatus("connected");
        } else if (s === "CHANNEL_ERROR") {
          setStatus("disconnected");
        } else if (s === "TIMED_OUT") {
          setStatus("disconnected");
        }
      });

      if (cancelled) {
        supabase.removeChannel(ch);
      }

      return () => {
        cancelled = true;
        setStatus("disconnected");
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      };
    } catch {
      setStatus("disconnected");
    }
  }, [channel, table, event, filter, enabled]);

  return { status };
}
