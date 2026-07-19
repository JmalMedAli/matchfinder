import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/helpers";

export async function GET(req: NextRequest) {
  const { supabase, user, error } = await requireAuth();
  if (error) return error;

  const { data: requests } = await supabase
    .from("join_requests")
    .select("*, matches(id, title, date, location, status)")
    .eq("player_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(requests ?? []);
}
