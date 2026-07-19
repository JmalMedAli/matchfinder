import { NextRequest, NextResponse } from "next/server";
import { UUID_RE, requireAuth } from "@/lib/api/helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const [matchesPlayed, matchesOrganized, profile, ratingResult] = await Promise.all([
    supabase
      .from("join_requests")
      .select("id", { count: "exact", head: true })
      .eq("player_id", id)
      .eq("status", "ACCEPTED"),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("organizer_id", id),
    supabase
      .from("profiles")
      .select("created_at")
      .eq("id", id)
      .single(),
    supabase.rpc("get_player_rating", { p_player_id: id }),
  ]);

  const ratingData = ratingResult.data?.[0];

  return NextResponse.json({
    matchesPlayed: matchesPlayed.count ?? 0,
    matchesOrganized: matchesOrganized.count ?? 0,
    memberSince: profile.data?.created_at ?? null,
    averageRating: Number(ratingData?.average_rating ?? 0),
    reviewCount: Number(ratingData?.review_count ?? 0),
  });
}
