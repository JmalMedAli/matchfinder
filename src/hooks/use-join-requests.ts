"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface JoinRequest {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  message: string | null;
  created_at: string;
  match_id: string;
  player_id: string;
  matches?: {
    id: string;
    title: string;
    date: string;
    location: string;
    status: string;
  };
  profiles?: {
    name: string | null;
    image: string | null;
    position: string | null;
    city: string | null;
    phone: string | null;
    whatsapp: string | null;
    facebook: string | null;
    instagram: string | null;
    show_phone: boolean;
    show_whatsapp: boolean;
    show_facebook: boolean;
    show_instagram: boolean;
  };
}

async function createJoinRequest(matchId: string): Promise<JoinRequest> {
  const res = await fetch("/api/join-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matchId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to join");
  }
  return res.json();
}

async function updateJoinRequest(
  id: string,
  data: { status: "ACCEPTED" | "REJECTED" },
): Promise<{ success: boolean }> {
  const res = await fetch(`/api/join-requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to update request");
  }
  return res.json();
}

async function fetchMyJoinRequests(): Promise<JoinRequest[]> {
  const res = await fetch("/api/join-requests/mine");
  if (!res.ok) throw new Error("Failed to fetch requests");
  return res.json();
}

async function withdrawJoinRequest(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/join-requests/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to withdraw request");
  }
  return res.json();
}

export function useJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ matchId }: { matchId: string }) => createJoinRequest(matchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["join-requests"] });
    },
  });
}

export function useUpdateJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: "ACCEPTED" | "REJECTED" } }) =>
      updateJoinRequest(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["join-requests"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

export function useRemoveAcceptedPlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      updateJoinRequest(id, { status: "REJECTED" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["join-requests"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

export function useJoinRequests() {
  return useQuery({
    queryKey: ["join-requests", "mine"],
    queryFn: fetchMyJoinRequests,
  });
}

export function useWithdrawJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => withdrawJoinRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["join-requests"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

async function fetchIncomingJoinRequests(): Promise<JoinRequest[]> {
  const res = await fetch("/api/join-requests/incoming");
  if (!res.ok) throw new Error("Failed to fetch incoming requests");
  return res.json();
}

export function useIncomingJoinRequests() {
  return useQuery({
    queryKey: ["join-requests", "incoming"],
    queryFn: fetchIncomingJoinRequests,
  });
}
