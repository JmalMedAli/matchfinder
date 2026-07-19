import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/helpers";

export async function GET() {
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const { data, error } = await supabase
    .from("matches")
    .select("*, profiles!organizer_id(name, image), join_requests(status), football_fields(name, city)")
    .eq("is_featured", true)
    .in("status", ["OPEN", "FULL"])
    .order("date", { ascending: true })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
