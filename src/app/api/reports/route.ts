import { NextResponse } from "next/server";
import { UUID_RE, jsonError, parseJsonBody, requireAuth } from "@/lib/api/helpers";
import { rateLimit } from "@/lib/rate-limit";

const TARGET_TYPES = ["user", "match", "review", "field"] as const;

interface ReportBody {
  target_type: string;
  target_id: string;
  reason: string;
  description?: string;
}

export async function POST(req: Request) {
  const { supabase, user, error } = await requireAuth();
  if (error) return error;

  if (!(await rateLimit(supabase, "report"))) {
    return jsonError("Too many requests", 429);
  }

  const { body, error: bodyError } = await parseJsonBody<ReportBody>(req);
  if (bodyError) return bodyError;

  if (!TARGET_TYPES.includes(body.target_type as (typeof TARGET_TYPES)[number])) {
    return jsonError("Invalid target_type");
  }
  if (!UUID_RE.test(body.target_id)) return jsonError("Invalid target_id");
  if (!body.reason?.trim()) return jsonError("Reason is required");

  const { error: insertError } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: body.target_type,
    target_id: body.target_id,
    reason: body.reason.trim(),
    description: body.description?.trim() || null,
  });

  if (insertError) return jsonError(insertError.message, 500);
  return NextResponse.json({ success: true }, { status: 201 });
}
