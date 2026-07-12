import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [users, matches, joinRequests, reviews] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("matches").select("id, status", { count: "exact" }),
    supabase.from("join_requests").select("id, status", { count: "exact" }),
    supabase.from("reviews").select("id", { count: "exact", head: true }),
  ]);

  const matchesData = matches.data ?? [];
  const jrData = joinRequests.data ?? [];

  return NextResponse.json({
    totalUsers: users.count ?? 0,
    totalMatches: matches.count ?? 0,
    openMatches: matchesData.filter((m) => m.status === "OPEN").length,
    completedMatches: matchesData.filter((m) => m.status === "COMPLETED").length,
    totalJoinRequests: joinRequests.count ?? 0,
    pendingRequests: jrData.filter((r) => r.status === "PENDING").length,
    acceptedRequests: jrData.filter((r) => r.status === "ACCEPTED").length,
    totalReviews: reviews.count ?? 0,
  });
}
