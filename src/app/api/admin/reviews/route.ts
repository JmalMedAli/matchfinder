import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/helpers";

// Supabase's untyped client infers embedded many-to-one FK selects as
// arrays in some query shapes — normalize either shape to a single value.
function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

export async function GET() {
  const { supabase, error } = await requireStaff();
  if (error) return error;

  const [peer, matchReviews, fieldReviews] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, rating, comment, created_at, match_id, reviewer:profiles!reviews_reviewer_id_fkey(name), player:profiles!reviews_player_id_fkey(name)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("match_reviews")
      .select("id, overall_rating, comment, created_at, match_id, reviewer:profiles!match_reviews_reviewer_id_fkey(name)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("field_reviews")
      .select("id, rating, comment, created_at, field_id, reviewer:profiles!field_reviews_reviewer_id_fkey(name), football_fields(name)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (peer.error || matchReviews.error || fieldReviews.error) {
    return jsonError(peer.error?.message ?? matchReviews.error?.message ?? fieldReviews.error?.message ?? "Failed to load reviews", 500);
  }

  const combined = [
    ...(peer.data ?? []).map((r) => ({
      id: r.id,
      type: "reviews" as const,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      reviewer: one(r.reviewer)?.name ?? "Unknown",
      subject: one(r.player)?.name ? `Rated ${one(r.player)?.name}` : "Peer rating",
    })),
    ...(matchReviews.data ?? []).map((r) => ({
      id: r.id,
      type: "match_reviews" as const,
      rating: r.overall_rating,
      comment: r.comment,
      created_at: r.created_at,
      reviewer: one(r.reviewer)?.name ?? "Unknown",
      subject: "Match experience",
    })),
    ...(fieldReviews.data ?? []).map((r) => ({
      id: r.id,
      type: "field_reviews" as const,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      reviewer: one(r.reviewer)?.name ?? "Unknown",
      subject: one(r.football_fields)?.name ? `Field: ${one(r.football_fields)?.name}` : "Field review",
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ reviews: combined.slice(0, 50) });
}
