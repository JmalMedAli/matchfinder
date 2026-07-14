import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: field, error } = await supabase
    .from("football_fields")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !field) {
    return NextResponse.json({ error: "Field not found" }, { status: 404 });
  }

  const { data: matches } = await supabase
    .from("matches")
    .select(`
      id, title, date, max_players, price_per_person, status, position_needed,
      organizer:profiles!organizer_id(name, image)
    `)
    .eq("football_field_id", id)
    .in("status", ["OPEN", "FULL"])
    .order("date", { ascending: true });

  const enriched = await Promise.all(
    (matches ?? []).map(async (m) => {
      const { count } = await supabase
        .from("join_requests")
        .select("id", { count: "exact", head: true })
        .eq("match_id", m.id)
        .eq("status", "ACCEPTED");
      return { ...m, accepted_count: count ?? 0 };
    }),
  );

  return NextResponse.json({
    ...field,
    match_count: enriched.length,
    upcoming_matches: enriched,
  });
}
