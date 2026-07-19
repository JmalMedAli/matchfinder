import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const code = body.code as string | undefined;

  const { data: match } = await supabase
    .from("matches")
    .select("id, organizer_id, checkin_code, status")
    .eq("id", id)
    .single();

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const isOrganizer = match.organizer_id === user.id;

  if (!isOrganizer && match.checkin_code && code !== match.checkin_code) {
    return NextResponse.json({ error: "Invalid check-in code" }, { status: 403 });
  }

  const { data: existing } = await supabase
    .from("match_checkins")
    .select("id")
    .eq("match_id", id)
    .eq("player_id", user.id)
    .single();

  if (existing) return NextResponse.json({ error: "Already checked in" }, { status: 400 });

  const { error } = await supabase
    .from("match_checkins")
    .insert({ match_id: id, player_id: user.id, method: isOrganizer ? "organizer" : "code" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  const { data: checkins } = await supabase
    .from("match_checkins")
    .select("*, profiles!player_id(id, name, image)")
    .eq("match_id", id);

  return NextResponse.json(checkins ?? []);
}
