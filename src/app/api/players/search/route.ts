import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/helpers";

export async function GET(req: NextRequest) {
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ players: [] });
  }

  const { data: players, error } = await supabase
    .from("profiles")
    .select("id, name, image, position, city")
    .ilike("name", `%${q}%`)
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ players: players ?? [] });
}
