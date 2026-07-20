import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/admin";
import { UUID_RE, jsonError } from "@/lib/api/helpers";
import { rateLimit } from "@/lib/rate-limit";

const TABLES = ["reviews", "match_reviews", "field_reviews"] as const;

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("Invalid id");

  const { supabase, error } = await requireStaff();
  if (error) return error;

  if (!(await rateLimit(supabase, "admin-review-delete"))) {
    return jsonError("Too many requests", 429);
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  if (!type || !TABLES.includes(type as (typeof TABLES)[number])) {
    return jsonError("Invalid or missing type query param");
  }

  const { error: deleteError } = await supabase.from(type).delete().eq("id", id);
  if (deleteError) return jsonError(deleteError.message, 500);

  return NextResponse.json({ success: true });
}
