"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { FootballField } from "@/types/football-field";

async function fetchFootballFields(search?: string): Promise<FootballField[]> {
  const supabase = createClient();
  let query = supabase
    .from("football_fields")
    .select("*")
    .order("city")
    .order("name");

  if (search?.trim()) {
    const q = search.trim();
    query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,address.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function fetchFootballField(id: string): Promise<FootballField | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("football_fields")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export function useFootballFields(search?: string) {
  return useQuery({
    queryKey: ["football-fields", search ?? ""],
    queryFn: () => fetchFootballFields(search),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFootballField(id: string | null | undefined) {
  return useQuery({
    queryKey: ["football-field", id],
    queryFn: () => fetchFootballField(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
