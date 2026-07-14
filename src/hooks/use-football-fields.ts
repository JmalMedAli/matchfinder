"use client";

import { useQuery } from "@tanstack/react-query";
import type { FootballField } from "@/types/football-field";

export interface FieldMatchSummary {
  id: string;
  title: string;
  date: string;
  max_players: number;
  price_per_person: number | null;
  status: string;
  position_needed: string | null;
  organizer: { name: string | null; image: string | null } | null;
  accepted_count: number;
}

export interface FieldWithMatches extends FootballField {
  match_count: number;
  upcoming_matches: FieldMatchSummary[];
}

export interface FieldListItem extends FootballField {
  match_count: number;
}

async function fetchAllFields(): Promise<FieldListItem[]> {
  const res = await fetch("/api/fields");
  if (!res.ok) throw new Error("Failed to fetch fields");
  return res.json();
}

async function fetchField(id: string): Promise<FieldWithMatches> {
  const res = await fetch(`/api/fields/${id}`);
  if (!res.ok) throw new Error("Field not found");
  return res.json();
}

export function useAllFootballFields() {
  return useQuery({
    queryKey: ["fields-all"],
    queryFn: fetchAllFields,
    staleTime: 30_000,
  });
}

export function useFootballFieldDetail(id: string | null) {
  return useQuery({
    queryKey: ["field-detail", id],
    queryFn: () => fetchField(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useFootballFields(search?: string) {
  return useQuery({
    queryKey: ["fields-list", search],
    queryFn: async () => {
      const res = await fetch(`/api/fields${search ? `?search=${encodeURIComponent(search)}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch fields");
      return res.json() as Promise<FootballField[]>;
    },
    staleTime: 30_000,
  });
}

export function useFootballField(id: string | null) {
  return useQuery({
    queryKey: ["field", id],
    queryFn: async () => {
      const res = await fetch(`/api/fields/${id}`);
      if (!res.ok) throw new Error("Field not found");
      return res.json() as Promise<FootballField>;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}
