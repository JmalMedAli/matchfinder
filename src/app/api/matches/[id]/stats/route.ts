import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: stats, error } = await supabase
    .from("match_player_stats")
    .select(`
      id, player_id, goals_scored, confirmed_by_organizer,
      player:profiles!player_id(name, image)
    `)
    .eq("match_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(stats ?? []);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { goalsScored } = body;

  const { data, error } = await supabase
    .from("match_player_stats")
    .upsert(
      { match_id: id, player_id: user.id, goals_scored: goalsScored ?? 0 },
      { onConflict: "match_id,player_id" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
