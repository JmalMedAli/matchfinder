"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

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
      <AnimatePresence mode="wait">
        <motion.span
          key={connected ? "live" : "offline"}
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: connected ? "#22c55e" : "#f87171" }}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {connected && (
            <motion.span
              className="absolute inset-0 rounded-full bg-green-500"
              animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </motion.span>
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <motion.span
          key={connected ? "live" : "offline"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {connected ? "Live" : "Offline"}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
