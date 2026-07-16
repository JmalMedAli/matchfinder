"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

async function fetchNotificationCount(): Promise<number> {
  try {
    const supabase = createClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return 0;

    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userRes.user.id)
      .eq("read", false);

    return count ?? 0;
  } catch {
    return 0;
  }
}

export function useNotificationCount() {
  return useQuery({
    queryKey: ["notification-count"],
    queryFn: fetchNotificationCount,
    refetchInterval: 15000,
  });
}
