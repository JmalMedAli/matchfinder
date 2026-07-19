import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/helpers";

export async function GET(req: NextRequest) {
  const { supabase, user, error } = await requireAuth();
  if (error) return error;

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json(data ?? []);
}
