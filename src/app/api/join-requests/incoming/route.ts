import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PROFILE_SELECT = "name, image, position, city";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
