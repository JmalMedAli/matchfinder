import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const body = await req.json();
  const { emoji } = body;

  if (!emoji) return NextResponse.json({ error: "emoji required" }, { status: 400 });

  const { data: existing } = await supabase
    .from("message_reactions")
    .select("id")
    .eq("message_id", id)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .single();

  if (existing) {
    await supabase.from("message_reactions").delete().eq("id", existing.id);
    return NextResponse.json({ action: "removed" });
  }

  const { error } = await supabase
    .from("message_reactions")
    .insert({ message_id: id, user_id: user.id, emoji });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ action: "added" }, { status: 201 });
}
