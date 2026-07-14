import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { recipientId, awardType } = body;

  if (!recipientId || !awardType) {
    return NextResponse.json({ error: "Missing recipientId or awardType" }, { status: 400 });
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
    await supabase.from("matches").update({ [updateField]: winner }).eq("id", id);

    // Update profile stats
    if (awardType === "man_of_match") {
      const { data: profile } = await supabase.from("profiles").select("motm_awards").eq("id", winner).single();
      if (profile) {
        await supabase.from("profiles").update({ motm_awards: (profile.motm_awards ?? 0) + 1 }).eq("id", winner);
      }
    }
  }

  return NextResponse.json(data);
}
