"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch("/api/notifications");
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

async function markAsRead(ids?: string[]): Promise<void> {
  const res = await fetch("/api/notifications/read", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error("Failed to mark as read");
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => markAsRead(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
