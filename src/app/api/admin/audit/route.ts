import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/helpers";

/**
 * Read-only view of admin_audit_log. Entries are written exclusively by the
 * SECURITY DEFINER trigger `log_staff_change()` (see
 * supabase/migration-admin-panel-security-hardening.sql) — this route has no
 * corresponding POST/PATCH/DELETE because nothing app-side is allowed to
 * write to this table.
 */
export async function GET(req: Request) {
  const { supabase, error } = await requireStaff();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const targetType = searchParams.get("targetType");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 30;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("admin_audit_log")
    .select("id, actor_id, action, target_type, target_id, old_data, new_data, reason, created_at, profiles!admin_audit_log_actor_id_fkey(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (targetType) query = query.eq("target_type", targetType);

  const { data, count, error: queryError } = await query;
  if (queryError) return jsonError(queryError.message, 500);

  return NextResponse.json({ entries: data ?? [], total: count ?? 0, page, pageSize });
}
