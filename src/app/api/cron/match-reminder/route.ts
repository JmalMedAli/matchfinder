import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/push/send";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  // Find matches starting within the next 60 minutes that haven't been reminded
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

  const { data: matches, error } = await supabase
    .from("matches")
    .select("id, title, date, organizer_id")
    .gte("date", now.toISOString())
    .lte("date", inOneHour.toISOString())
    .eq("status", "OPEN");

  if (error || !matches || matches.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;

  for (const match of matches) {
    // Get all accepted players for this match
    const { data: accepted } = await supabase
      .from("join_requests")
      .select("player_id")
      .eq("match_id", match.id)
      .eq("status", "ACCEPTED");

    if (!accepted || accepted.length === 0) continue;

    const playerIds = accepted.map((r) => r.player_id);
    // Also include the organizer
    playerIds.push(match.organizer_id);

    const uniqueIds = [...new Set(playerIds)];

    await sendPushToUsers(uniqueIds, {
      title: "Match starting soon!",
      body: `"${match.title}" starts in less than an hour`,
      url: `/dashboard/matches/${match.id}`,
      tag: `matchfinder-reminder-${match.id}`,
    });

    sent++;
  }

  return NextResponse.json({ sent });
}
