import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/helpers";

export async function GET() {
  const { supabase, error } = await requireStaff();
  if (error) return error;

  const [growth, popularCities, topOrganizers, topFields, playedAtLeastOnce, playedMoreThanOnce] =
    await Promise.all([
      supabase.rpc("admin_growth_series", { weeks: 12 }),
      supabase.rpc("admin_popular_cities", { result_limit: 8 }),
      supabase.rpc("admin_top_organizers", { result_limit: 5 }),
      supabase
        .from("football_fields")
        .select("id, name, city, rating, review_count")
        .order("review_count", { ascending: false })
        .limit(5),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("matches_played", 1),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("matches_played", 2),
    ]);

  if (growth.error) return jsonError(growth.error.message, 500);

  const atLeastOnce = playedAtLeastOnce.count ?? 0;
  const moreThanOnce = playedMoreThanOnce.count ?? 0;
  const retentionRate = atLeastOnce > 0 ? Math.round((moreThanOnce / atLeastOnce) * 100) : 0;

  return NextResponse.json({
    growth: growth.data ?? [],
    popularCities: popularCities.data ?? [],
    topOrganizers: topOrganizers.data ?? [],
    topFields: topFields.data ?? [],
    retention: { playedAtLeastOnce: atLeastOnce, playedMoreThanOnce: moreThanOnce, retentionRate },
  });
}
