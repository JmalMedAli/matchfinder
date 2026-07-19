import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("activity_feed")
    .select("*, profiles!user_id(name, image), matches!match_id(title, date)")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch target user names separately to avoid duplicate join alias
  const targetIds = (data ?? [])
    .map((r) => r.target_user_id)
    .filter((id): id is string => !!id);

  let targetNames: Record<string, string> = {};
  if (targetIds.length > 0) {
    const { data: targets } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", [...new Set(targetIds)]);
    if (targets) {
      targetNames = Object.fromEntries(targets.map((t) => [t.id, t.name]));
    }
  }

  const enriched = (data ?? []).map((r) => ({
    ...r,
    target_user_name: r.target_user_id ? targetNames[r.target_user_id] ?? null : null,
  }));

  return NextResponse.json(enriched);
}
