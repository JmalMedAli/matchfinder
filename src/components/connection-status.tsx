"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";

export function ConnectionStatus() {
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    let cancelled = false;

    try {
      const supabase = createClient();
      const ch = supabase.channel("connection-check");
      channelRef.current = ch;

      ch.on("broadcast", { event: "ping" }, () => {})
        .subscribe((status: string) => {
          if (cancelled) return;
          setConnected(status === "SUBSCRIBED");
        });

      return () => {
        cancelled = true;
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      };
    } catch {
      return () => { cancelled = true; };
    }
  }, []);

  return (
    <div className="flex items-center gap-1.5 px-4 py-2 text-[11px] text-muted-foreground">
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {connected && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        )}
        <motion.span
          className="relative inline-flex h-1.5 w-1.5 rounded-full"
          animate={{ backgroundColor: connected ? "#22c55e" : "#f87171" }}
          transition={{ duration: 0.3 }}
        />
      </span>
      <span>{connected ? "Live" : "Offline"}</span>
    </div>
  );
}
