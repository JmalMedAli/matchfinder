import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api/helpers";
import { notifyUser } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: awards, error } = await supabase
    .from("match_awards")
    .select(`
      id, award_type, recipient_id, voter_id,
      recipient:profiles!recipient_id(name, image),
      voter:profiles!voter_id(name)
    `)
    .eq("match_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Tally votes
  const tally: Record<string, Record<string, { count: number; voters: string[] }>> = {};
  for (const award of awards ?? []) {
    if (!tally[award.award_type]) tally[award.award_type] = {};
    if (!tally[award.award_type][award.recipient_id]) {
      tally[award.award_type][award.recipient_id] = { count: 0, voters: [] };
    }
    tally[award.award_type][award.recipient_id].count++;
    tally[award.award_type][award.recipient_id].voters.push(award.voter_id);
  }

  return NextResponse.json({ awards: awards ?? [], tally });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user, error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await req.json();
  const { recipientId, awardType } = body;

  if (!recipientId || !awardType) {
    return NextResponse.json({ error: "Missing recipientId or awardType" }, { status: 400 });
  }
  if (recipientId === user.id) {
    return NextResponse.json({ error: "Cannot vote for yourself" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("match_awards")
    .upsert(
      { match_id: id, voter_id: user.id, recipient_id: recipientId, award_type: awardType },
      { onConflict: "match_id,voter_id,award_type" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update match winner if this is the final tally
  const { count } = await supabase
    .from("join_requests")
    .select("id", { count: "exact", head: true })
    .eq("match_id", id)
    .eq("status", "ACCEPTED");

  const { data: allAwards } = await supabase
    .from("match_awards")
    .select("recipient_id, award_type")
    .eq("match_id", id)
    .eq("award_type", awardType);

  const tallied: Record<string, number> = {};
  for (const a of allAwards ?? []) {
    tallied[a.recipient_id] = (tallied[a.recipient_id] || 0) + 1;
  }

  let winner: string | null = null;
  let maxVotes = 0;
  for (const [pid, votes] of Object.entries(tallied)) {
    if (votes > maxVotes) { maxVotes = votes; winner = pid; }
  }

  if (winner && (count ?? 0) > 0 && maxVotes >= Math.ceil((count ?? 0) / 2)) {
    const updateField = awardType === "man_of_match" ? "motm_player_id" : "fair_play_player_id";

    const { data: match } = await supabase
      .from("matches")
      .select("title, motm_player_id, fair_play_player_id")
      .eq("id", id)
      .single();

    const currentWinner = awardType === "man_of_match" ? match?.motm_player_id : match?.fair_play_player_id;

    // Only act the moment the winner first crosses the threshold (or
    // changes) - otherwise every later vote would re-increment the
    // profile stat and re-notify the same winner.
    if (match && winner !== currentWinner) {
      await supabase.from("matches").update({ [updateField]: winner }).eq("id", id);

      if (awardType === "man_of_match") {
        const { data: profile } = await supabase.from("profiles").select("motm_awards").eq("id", winner).single();
        if (profile) {
          await supabase.from("profiles").update({ motm_awards: (profile.motm_awards ?? 0) + 1 }).eq("id", winner);
        }
      }

      await notifyUser({
        userId: winner,
        title: awardType === "man_of_match" ? "You were voted Man of the Match!" : "You were voted Fair Play!",
        message: `Your teammates voted you ${awardType === "man_of_match" ? "Man of the Match" : "Fair Play"} for "${match.title}".`,
        matchId: id,
        skipEmail: true,
      });
    }
  }

  return NextResponse.json(data);
}
