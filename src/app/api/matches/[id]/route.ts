import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PROFILE_SELECT = "name, image, position, city, bio, phone, whatsapp, facebook, instagram, show_phone, show_whatsapp, show_facebook, show_instagram";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("Invalid match ID format");

  const { data: match, error } = await supabase
    .from("matches")
    .select(`
      *,
      profiles!organizer_id(${PROFILE_SELECT}),
      join_requests(*, profiles!player_id(${PROFILE_SELECT})),
      football_fields!football_field_id(*)
    `)
    .eq("id", id)
    .single();

  if (error || !match) return jsonError("Match not found", 404);

  return NextResponse.json(match);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("Invalid match ID format");

  const { data: existing } = await supabase
    .from("matches")
    .select("organizer_id")
    .eq("id", id)
    .single();

  if (!existing) return jsonError("Match not found", 404);
  if (existing.organizer_id !== user.id) return jsonError("Only the organizer can edit", 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null;
  if (body.date !== undefined) {
    const matchDate = new Date(body.date as string);
    if (isNaN(matchDate.getTime())) return jsonError("Invalid date");
    if (matchDate.getTime() <= Date.now()) return jsonError("Match date must be in the future");
    data.date = matchDate.toISOString();
  }
  if (body.location !== undefined) data.location = String(body.location).trim();
  if (body.footballFieldId !== undefined) {
    const fid = body.footballFieldId;
    data.football_field_id = fid && UUID_RE.test(String(fid)) ? String(fid) : null;
  }
  if (body.maxPlayers !== undefined) {
    const mp = Number(body.maxPlayers);
    if (!Number.isFinite(mp) || mp < 2 || mp > 100) return jsonError("Max players must be between 2 and 100");
    data.max_players = mp;
  }
  if (body.status !== undefined) {
    const s = String(body.status);
    if (!["OPEN", "FULL", "CLOSED", "COMPLETED"].includes(s)) return jsonError("Invalid status value");
    data.status = s;
  }

  if (Object.keys(data).length === 0) return jsonError("No fields to update");

  const { data: updated, error } = await supabase
    .from("matches")
    .update(data)
    .eq("id", id)
    .select(`*, profiles!organizer_id(${PROFILE_SELECT})`)
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("Invalid match ID format");

  const { data: existing } = await supabase
    .from("matches")
    .select("organizer_id")
    .eq("id", id)
    .single();

  if (!existing) return jsonError("Match not found", 404);
  if (existing.organizer_id !== user.id) return jsonError("Only the organizer can delete", 403);

  const { error } = await supabase.from("matches").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ success: true });
}
