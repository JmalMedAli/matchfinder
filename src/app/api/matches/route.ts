import { NextRequest, NextResponse } from "next/server";
import { UUID_RE, PROFILE_SELECT, jsonError, requireAuth, parseJsonBody } from "@/lib/api/helpers";

export async function GET(req: NextRequest) {
  const { supabase, error: authError } = await requireAuth();
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

  if (status && ["OPEN", "FULL", "CLOSED", "COMPLETED", "ARCHIVED"].includes(status)) {
    query = query.eq("status", status);
  }
  if (search) {
    // Strip characters that are structurally significant to a PostgREST
    // .or(...) filter string (comma separates conditions, parens group them)
    // so user input can't break out of the intended ilike conditions.
    const safeSearch = search.replace(/[,()]/g, "");
    if (safeSearch) {
      query = query.or(`title.ilike.%${safeSearch}%,location.ilike.%${safeSearch}%`);
    }
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

  const { body, error: bodyError } = await parseJsonBody(req);
  if (bodyError) return bodyError;

  const title = body.title as string | undefined;
  const description = body.description as string | undefined;
  const date = body.date as string | undefined;
  const location = body.location as string | undefined;
  const footballFieldId = body.footballFieldId as string | undefined;
  const maxPlayers = body.maxPlayers as number | undefined;
  const positionNeeded = body.positionNeeded as string | undefined;
  const pricePerPerson = body.pricePerPerson as number | undefined;

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
      position_needed: positionNeeded?.trim() || null,
      price_per_person: pricePerPerson && pricePerPerson > 0 ? pricePerPerson : null,
      organizer_id: user.id,
    })
    .select(`*, profiles!organizer_id(${PROFILE_SELECT})`)
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json(match, { status: 201 });
}
