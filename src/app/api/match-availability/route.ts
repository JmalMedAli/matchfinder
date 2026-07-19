import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UUID_RE, requireAuth, parseJsonBody } from "@/lib/api/helpers";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");

  if (!matchId || !UUID_RE.test(matchId)) {
    return NextResponse.json({ error: "matchId required" }, { status: 400 });
  }

  const { data } = await supabase
    .from("match_availability")
    .select("*, profiles!user_id(name, image)")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { supabase, user, error } = await requireAuth();
  if (error) return error;

  const { body, error: bodyError } = await parseJsonBody<{ matchId?: string; status?: string; note?: string }>(req, "Invalid JSON");
  if (bodyError) return bodyError;

  const { matchId, status: availStatus, note } = body;
  if (!matchId || !availStatus) {
    return NextResponse.json({ error: "matchId and status required" }, { status: 400 });
  }
  if (!UUID_RE.test(matchId)) {
    return NextResponse.json({ error: "Invalid matchId" }, { status: 400 });
  }
  if (!["available", "maybe", "unavailable"].includes(availStatus)) {
    return NextResponse.json({ error: "Status must be available, maybe, or unavailable" }, { status: 400 });
  }

  const { data, error: upsertError } = await supabase
    .from("match_availability")
    .upsert(
      { match_id: matchId, user_id: user.id, status: availStatus, note: note?.trim() || null },
      { onConflict: "match_id,user_id" },
    )
    .select()
    .single();

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
