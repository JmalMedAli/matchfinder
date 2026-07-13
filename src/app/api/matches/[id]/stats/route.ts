import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: match } = await supabase
    .from("matches")
    .select("*, join_requests(status, player_id, profiles!player_id(position))")
    .eq("id", id)
    .single();

  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const requests = match.join_requests ?? [];
  const accepted = requests.filter((r: any) => r.status === "ACCEPTED");
  const pending = requests.filter((r: any) => r.status === "PENDING");
  const rejected = requests.filter((r: any) => r.status === "REJECTED");

  const positionCounts: Record<string, number> = {};
  accepted.forEach((r: any) => {
    const pos = r.profiles?.position ?? "Unknown";
    positionCounts[pos] = (positionCounts[pos] || 0) + 1;
  });

  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating")
    .eq("match_id", id);

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  const { count: checkinCount } = await supabase
    .from("match_checkins")
    .select("*", { count: "exact", head: true })
    .eq("match_id", id);

  return NextResponse.json({
    total_requests: requests.length,
    accepted: accepted.length,
    pending: pending.length,
    rejected: rejected.length,
    fill_rate: Math.round((accepted.length / match.max_players) * 100),
    position_distribution: positionCounts,
    avg_rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
    review_count: reviews?.length ?? 0,
    checkins: checkinCount ?? 0,
    attendance_rate: accepted.length > 0 ? Math.round(((checkinCount ?? 0) / accepted.length) * 100) : null,
  });
}
