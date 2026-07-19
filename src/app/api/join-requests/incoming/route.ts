import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/helpers";

export async function GET() {
  const { supabase, user, error } = await requireAuth();
  if (error) return error;

  const { data: matches } = await supabase
    .from("matches")
    .select("id")
    .eq("organizer_id", user.id);

  const matchIds = (matches ?? []).map((m) => m.id);
  if (matchIds.length === 0) return NextResponse.json([]);

  const { data: requests } = await supabase
    .from("join_requests")
    .select("*, matches(id, title, date, location, status), profiles!player_id(id, name, image, position, city)")
    .in("match_id", matchIds)
    .eq("status", "PENDING")
    .order("created_at", { ascending: false });

  return NextResponse.json(requests ?? []);
}
