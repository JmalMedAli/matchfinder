import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/admin";

export async function GET() {
  const { supabase, error } = await requireStaff();
  if (error) return error;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [
    totalUsers,
    activeUsers,
    totalMatches,
    matchesToday,
    completedMatches,
    totalFields,
    pendingReports,
    totalReviews,
    growth,
    popularCities,
    popularFields,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("matches").select("id", { count: "exact", head: true }),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .gte("date", startOfDay.toISOString())
      .lt("date", endOfDay.toISOString()),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "COMPLETED"),
    supabase.from("football_fields").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("reviews").select("id", { count: "exact", head: true }),
    supabase.rpc("admin_growth_series", { weeks: 8 }),
    supabase.rpc("admin_popular_cities", { result_limit: 5 }),
    supabase
      .from("football_fields")
      .select("id, name, city, rating, review_count")
      .order("review_count", { ascending: false })
      .limit(5),
  ]);

  return NextResponse.json({
    totalUsers: totalUsers.count ?? 0,
    activeUsers: activeUsers.count ?? 0,
    totalMatches: totalMatches.count ?? 0,
    matchesToday: matchesToday.count ?? 0,
    completedMatches: completedMatches.count ?? 0,
    totalFields: totalFields.count ?? 0,
    pendingReports: pendingReports.count ?? 0,
    totalReviews: totalReviews.count ?? 0,
    growth: growth.data ?? [],
    popularCities: popularCities.data ?? [],
    popularFields: popularFields.data ?? [],
  });
}
