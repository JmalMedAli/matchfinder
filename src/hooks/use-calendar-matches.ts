"use client";

import { useQuery } from "@tanstack/react-query";

export interface CalendarMatch {
  id: string;
  title: string;
  date: string;
  location: string;
  max_players: number;
  status: string;
  position_needed: string | null;
  price_per_person: number | null;
  organizer_id: string;
  football_field_id: string | null;
  profiles: { name: string | null; image: string | null } | null;
  join_requests: { status: string; player_id: string }[];
  football_fields: { id: string; name: string; city: string } | null;
  accepted_count: number;
  user_relation: "organizer" | "joined" | "pending" | "rejected" | "available";
}

async function fetchCalendarMatches(from: string, to: string): Promise<CalendarMatch[]> {
  const res = await fetch(`/api/matches/calendar?from=${from}&to=${to}`);
  if (!res.ok) throw new Error("Failed to fetch calendar matches");
  return res.json();
}

export function useCalendarMatches(from: string, to: string) {
  return useQuery({
    queryKey: ["calendar-matches", from, to],
    queryFn: () => fetchCalendarMatches(from, to),
    staleTime: 60_000,
  });
}
