"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface UnreadCount {
  conversation_id: string;
  unread_count: number;
}

async function fetchUnreadCounts(): Promise<UnreadCount[]> {
  try {
    const supabase = createClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return [];

    const { data } = await supabase.rpc("get_unread_counts", {
      uid: userRes.user.id,
    });
    return (data as UnreadCount[]) ?? [];
  } catch {
    return [];
  }
}

export function useUnreadCounts() {
  return useQuery({
    queryKey: ["unread-counts"],
    queryFn: fetchUnreadCounts,
    refetchInterval: 15000,
  });
}

export function useTotalUnreadCount(): number {
  const { data } = useUnreadCounts();
  return data?.reduce((sum, c) => sum + Number(c.unread_count), 0) ?? 0;
}
