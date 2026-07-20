"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { FootballField } from "@/types/football-field";

export interface MatchOrganizer {
  name: string | null;
  image: string | null;
  position: string | null;
  city: string | null;
  bio: string | null;
  phone: string | null;
  whatsapp: string | null;
  facebook: string | null;
  instagram: string | null;
  show_phone: boolean;
  show_whatsapp: boolean;
  show_facebook: boolean;
  show_instagram: boolean;
}

export interface JoinRequestSummary {
  id: string;
  player_id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
}

export interface MatchFieldSummary {
  id: string;
  name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
}

export interface Match {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string;
  football_field_id: string | null;
  max_players: number;
  status: "OPEN" | "FULL" | "CLOSED" | "COMPLETED" | "ARCHIVED";
  position_needed: string | null;
  price_per_person: number | null;
  motm_player_id: string | null;
  fair_play_player_id: string | null;
  created_at: string;
  updated_at: string;
  organizer_id: string;
  profiles: MatchOrganizer;
  join_requests: JoinRequestSummary[];
  football_fields: MatchFieldSummary | null;
}

export interface MatchDetail extends Match {
  join_requests: (JoinRequestSummary & {
    profiles: MatchOrganizer;
  })[];
  football_fields: FootballField | null;
}

interface MatchesResponse {
  matches: Match[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface MatchFilters {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  organizerId?: string;
}

async function fetchMatches(filters: MatchFilters = {}): Promise<MatchesResponse> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  if (filters.organizerId) params.set("organizerId", filters.organizerId);

  const res = await fetch(`/api/matches?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch matches");
  return res.json();
}

async function fetchMatch(id: string): Promise<MatchDetail> {
  const res = await fetch(`/api/matches/${id}`);
  if (!res.ok) throw new Error("Failed to fetch match");
  return res.json();
}

async function createMatch(data: {
  title: string;
  description?: string;
  date: string;
  location: string;
  footballFieldId?: string;
  maxPlayers: number;
  positionNeeded?: string;
  pricePerPerson?: number;
}): Promise<Match> {
  const res = await fetch("/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to create match");
  }
  return res.json();
}

async function updateMatch(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    date: string;
    location: string;
    footballFieldId: string | null;
    maxPlayers: number;
    positionNeeded: string;
    pricePerPerson: number;
    status: string;
  }>,
): Promise<Match> {
  const res = await fetch(`/api/matches/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to update match");
  }
  return res.json();
}

async function deleteMatch(id: string): Promise<void> {
  const res = await fetch(`/api/matches/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to delete match");
  }
}

export function useMatches(filters: MatchFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["matches", filters],
    queryFn: () => fetchMatches(filters),
    enabled: options.enabled,
  });
}

export function useMatch(id: string) {
  return useQuery({
    queryKey: ["match", id],
    queryFn: () => fetchMatch(id),
    enabled: !!id,
  });
}

export function useCreateMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createMatch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

export function useUpdateMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateMatch>[1] }) =>
      updateMatch(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["match", variables.id] });
    },
  });
}

export function useDeleteMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMatch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}
