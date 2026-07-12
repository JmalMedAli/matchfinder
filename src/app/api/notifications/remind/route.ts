import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const { data: matches } = await supabase
    .from("matches")
    .select(`
      id, title, date, location,
      join_requests!match_id(player_id, status, profiles!player_id(email, name))
    `)
    .eq("status", "OPEN")
    .gte("date", now.toISOString())
    .lte("date", oneHourLater.toISOString());

  if (!matches || matches.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  for (const match of matches) {
    const participants = (match.join_requests ?? [])
      .filter((r: any) => r.status === "ACCEPTED" && r.profiles?.email);

    for (const req of participants) {
      const profile = req.profiles as any;
      const matchDate = new Date(match.date);
      const minsUntil = Math.round((matchDate.getTime() - now.getTime()) / 60000);

      await supabase.rpc("create_notification", {
        p_user_id: req.player_id,
        p_title: `Match starting in ${minsUntil} min`,
        p_message: `"${match.title}" at ${match.location} — don't forget!`,
        p_match_id: match.id,
      });
      sent++;
    }
  }

  return NextResponse.json({ sent });
}
