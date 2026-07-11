import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PROFILE_SELECT = "name, image, position, city, bio, phone, whatsapp, facebook, instagram, show_phone, show_whatsapp, show_facebook, show_instagram";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { supabase, user, error: null };
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  const { supabase, user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "12", 10)));
  const search = searchParams.get("search") ?? undefined;

  let query = supabase
    .from("matches")
    .select(`*, profiles!organizer_id(${PROFILE_SELECT}), join_requests(status), football_fields(id, name, city, latitude, longitude)`, { count: "exact" })
    .order("date", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status && ["OPEN", "FULL", "CLOSED", "COMPLETED"].includes(status)) {
    query = query.eq("status", status);
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,location.ilike.%${search}%`);
  }

  const { data: matches, count, error } = await query;
  if (error) return jsonError(error.message, 500);

  const total = count ?? 0;

  return NextResponse.json({
    matches: matches ?? [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const { supabase, user, error: authError } = await requireAuth();
  if (authError) return authError;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const title = body.title as string | undefined;
  const description = body.description as string | undefined;
  const date = body.date as string | undefined;
  const location = body.location as string | undefined;
  const footballFieldId = body.footballFieldId as string | undefined;
  const maxPlayers = body.maxPlayers as number | undefined;

  if (!title?.trim()) return jsonError("Title is required");
  if (!date || isNaN(Date.parse(date))) return jsonError("Valid date is required");
  if (!location?.trim()) return jsonError("Location is required");
  if (!maxPlayers || typeof maxPlayers !== "number" || maxPlayers < 2 || maxPlayers > 100) {
    return jsonError("Max players must be between 2 and 100");
  }

  const matchDate = new Date(date);
  if (matchDate.getTime() <= Date.now()) {
    return jsonError("Match date must be in the future");
  }

  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      date: new Date(date).toISOString(),
      location: location.trim(),
      football_field_id: footballFieldId && UUID_RE.test(footballFieldId) ? footballFieldId : null,
      max_players: maxPlayers,
      organizer_id: user.id,
    })
    .select(`*, profiles!organizer_id(${PROFILE_SELECT})`)
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json(match, { status: 201 });
}
