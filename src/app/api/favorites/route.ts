import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/helpers";

export async function GET() {
  const { supabase, user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { data, error } = await supabase
    .from("player_favorites")
    .select("id, player_id, profiles!player_id(id, name, image, position, city)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const { supabase, user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { playerId } = await req.json();
  if (!playerId) return NextResponse.json({ error: "playerId required" }, { status: 400 });

  const { data: existing } = await supabase
    .from("player_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("player_id", playerId)
    .single();

  if (existing) {
    await supabase.from("player_favorites").delete().eq("id", existing.id);
    return NextResponse.json({ action: "removed" });
  }

  const { error } = await supabase
    .from("player_favorites")
    .insert({ user_id: user.id, player_id: playerId });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ action: "added" }, { status: 201 });
}
