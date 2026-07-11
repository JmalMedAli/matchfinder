"use client";

import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeChannel } from "./use-realtime";
import { toast } from "sonner";

interface UseRealtimeNotificationsOptions {
  userId: string | null;
  onUnreadCountChange?: (count: number) => void;
}

export function useRealtimeNotifications({
  userId,
  onUnreadCountChange,
}: UseRealtimeNotificationsOptions) {
  const qc = useQueryClient();
  const latestRef = useRef<string | null>(null);

  const handleNotification = useCallback(
    (payload: Record<string, unknown>) => {
      const id = payload.id as string;
      if (!id) return;
      if (latestRef.current === id) return;
      latestRef.current = id;
      setTimeout(() => { latestRef.current = null; }, 3000);

      const title = (payload.title as string) ?? "New notification";
      const message = (payload.message as string) ?? "";

      toast.info(title, { description: message });

      qc.invalidateQueries({ queryKey: ["notifications"] });

      if (onUnreadCountChange) {
        const current = qc.getQueryData<number>(["notifications", "unread-count"]) ?? 0;
        qc.setQueryData(["notifications", "unread-count"], current + 1);
        onUnreadCountChange(current + 1);
      }
    },
    [qc, onUnreadCountChange],
  );

  useRealtimeChannel({
    channel: userId ? `notifications:${userId}` : "notifications:anon",
    table: "notifications",
    event: "INSERT",
    filter: userId ? `user_id=eq.${userId}` : undefined,
    onEvent: handleNotification,
    enabled: !!userId,
  });
}
