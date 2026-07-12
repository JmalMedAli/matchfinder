"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface UpcomingMatch {
  id: string;
  title: string;
  date: string;
  location: string;
}

async function fetchUpcomingMatches(): Promise<UpcomingMatch[]> {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const res = await fetch(
    `/api/matches?status=OPEN&pageSize=50`
  );
  if (!res.ok) return [];
  const data = await res.json();
  const matches = data.matches ?? [];
  return matches.filter((m: UpcomingMatch) => {
    const d = new Date(m.date);
    return d > now && d <= oneHourLater;
  });
}

export function useMatchReminders() {
  const remindedRef = useRef<Set<string>>(new Set());

  const { data: upcoming } = useQuery({
    queryKey: ["match-reminders"],
    queryFn: fetchUpcomingMatches,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!upcoming || upcoming.length === 0) return;
    for (const match of upcoming) {
      if (remindedRef.current.has(match.id)) continue;
      remindedRef.current.add(match.id);

      const matchDate = new Date(match.date);
      const minsUntil = Math.round((matchDate.getTime() - Date.now()) / 60000);

      toast.info(`Match starting in ${minsUntil} min`, {
        description: `${match.title} at ${match.location}`,
        duration: 10000,
        action: {
          label: "View",
          onClick: () => {
            window.location.href = `/dashboard/matches/${match.id}`;
          },
        },
      });
    }
  }, [upcoming]);
}
