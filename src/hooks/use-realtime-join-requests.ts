"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeChannel } from "./use-realtime";

interface UseRealtimeJoinRequestsOptions {
  matchId: string;
  enabled?: boolean;
}

export function useRealtimeJoinRequests({
  matchId,
  enabled = true,
}: UseRealtimeJoinRequestsOptions) {
  const qc = useQueryClient();

  const handleChange = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["match", matchId] });
    qc.invalidateQueries({ queryKey: ["matches"] });
    qc.invalidateQueries({ queryKey: ["join-requests"] });
  }, [qc, matchId]);

  useRealtimeChannel({
    channel: `join_requests:${matchId}`,
    table: "join_requests",
    event: "*",
    filter: `match_id=eq.${matchId}`,
    onEvent: handleChange,
    enabled: enabled && !!matchId,
  });
}
