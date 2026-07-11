import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: requests } = await supabase
    .from("join_requests")
    .select("*, matches(id, title, date, location, status)")
    .eq("player_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(requests ?? []);
}
