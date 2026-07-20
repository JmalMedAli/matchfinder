import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/admin";
import { UUID_RE, jsonError, parseJsonBody } from "@/lib/api/helpers";
import { rateLimit } from "@/lib/rate-limit";
import { notifyUser } from "@/lib/notify";

type Action = "warn" | "suspend" | "ban" | "dismiss";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("Invalid id");

  const { supabase, user, error } = await requireStaff();
  if (error) return error;

  if (!(await rateLimit(supabase, "admin-report-patch"))) {
    return jsonError("Too many requests", 429);
  }

  const { body, error: bodyError } = await parseJsonBody<{ action: Action }>(req);
  if (bodyError) return bodyError;

  const { data: report } = await supabase.from("reports").select("*").eq("id", id).single();
  if (!report) return jsonError("Report not found", 404);

  const status = body.action === "dismiss" ? "dismissed" : body.action === "warn" ? "reviewed" : "actioned";

  const { error: updateError } = await supabase
    .from("reports")
    .update({ status, resolved_by: user.id, resolved_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) return jsonError(updateError.message, 500);

  // Only "user" reports carry a moderatable account; match/review/field
  // reports are resolved on the report itself (no target profile to act on).
  if (report.target_type === "user" && (body.action === "warn" || body.action === "suspend" || body.action === "ban")) {
    if (body.action === "warn") {
      await notifyUser({
        userId: report.target_id,
        title: "You've received a warning",
        message: `An administrator reviewed a report about your account: ${report.reason}`,
        skipEmail: false,
      });
    } else {
      await supabase
        .from("profiles")
        .update({ status: body.action === "ban" ? "banned" : "suspended" })
        .eq("id", report.target_id);
      await notifyUser({
        userId: report.target_id,
        title: body.action === "ban" ? "Your account has been banned" : "Your account has been suspended",
        message: "Contact support if you believe this was a mistake.",
        skipEmail: false,
      });
    }
  }

  return NextResponse.json({ success: true });
}
