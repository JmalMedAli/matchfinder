import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PROFILE_SELECT = "name, image, position";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "Missing from/to dates" }, { status: 400 });
  }

  const { data: matches, error } = await supabase
    .from("matches")
    .select(`
      id, title, date, location, max_players, status, position_needed, price_per_person,
      organizer_id, football_field_id,
      profiles!organizer_id(${PROFILE_SELECT}),
      join_requests(status, player_id),
      football_fields(id, name, city)
    `)
    .gte("date", from)
    .lte("date", to)
    .not("status", "eq", "ARCHIVED")
    .order("date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with user relationship
  const enriched = (matches ?? []).map((m) => {
    const isOrganizer = m.organizer_id === user.id;
    const myRequest = m.join_requests?.find((r) => r.player_id === user.id);
    const acceptedCount = m.join_requests?.filter((r) => r.status === "ACCEPTED").length ?? 0;

    let userRelation: "organizer" | "joined" | "pending" | "rejected" | "available" = "available";
    if (isOrganizer) userRelation = "organizer";
    else if (myRequest?.status === "ACCEPTED") userRelation = "joined";
    else if (myRequest?.status === "PENDING") userRelation = "pending";
    else if (myRequest?.status === "REJECTED") userRelation = "rejected";

    return {
      ...m,
      accepted_count: acceptedCount,
      user_relation: userRelation,
    };
  });

  return NextResponse.json(enriched);
}
