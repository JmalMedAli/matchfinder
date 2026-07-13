"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface MatchTemplate {
  id: string;
  name: string;
  title: string;
  description: string | null;
  location: string | null;
  football_field_id: string | null;
  max_players: number;
  position_needed: string | null;
  created_at: string;
}

async function fetchTemplates(): Promise<MatchTemplate[]> {
  const res = await fetch("/api/match-templates");
  if (!res.ok) throw new Error("Failed to fetch templates");
  return res.json();
}

async function createTemplate(data: Omit<MatchTemplate, "id" | "created_at">): Promise<MatchTemplate> {
  const res = await fetch("/api/match-templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create template");
  return res.json();
}

async function deleteTemplate(id: string): Promise<void> {
  const res = await fetch(`/api/match-templates/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete template");
}

export function useMatchTemplates() {
  return useQuery({ queryKey: ["match-templates"], queryFn: fetchTemplates, staleTime: 30_000 });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match-templates"] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match-templates"] }),
  });
}
