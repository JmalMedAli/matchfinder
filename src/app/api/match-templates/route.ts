import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("match_templates")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, title, description, location, football_field_id, max_players, position_needed } = body;

  if (!name?.trim() || !title?.trim()) return NextResponse.json({ error: "Name and title required" }, { status: 400 });

  const { data, error } = await supabase
    .from("match_templates")
    .insert({
      user_id: user.id,
      name: name.trim(),
      title: title.trim(),
      description: description?.trim() || null,
      location: location?.trim() || null,
      football_field_id: football_field_id || null,
      max_players: max_players || 14,
      position_needed: position_needed?.trim() || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
