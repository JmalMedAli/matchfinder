import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/helpers";

export async function GET(req: Request) {
  const { supabase, error } = await requireStaff();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("reports")
    .select("id, reporter_id, target_type, target_id, reason, description, status, resolved_at, created_at, profiles!reports_reporter_id_fkey(name, email)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) query = query.eq("status", status);

  const { data, error: queryError } = await query;
  if (queryError) return jsonError(queryError.message, 500);

  return NextResponse.json({ reports: data ?? [] });
}
