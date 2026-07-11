"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ProfileUpdate } from "@/types/profile";
import { PROFILE_FIELDS } from "@/types/profile";

async function fetchProfile(): Promise<Profile> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS.join(", "))
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data;
}

async function updateProfile(updates: ProfileUpdate): Promise<Profile> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select(PROFILE_FIELDS.join(", "))
    .single();

  if (error) throw error;
  return data;
}

async function uploadAvatar(file: File): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(path);

  return urlData.publicUrl;
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useUploadAvatar() {
  return useMutation({
    mutationFn: uploadAvatar,
  });
}
