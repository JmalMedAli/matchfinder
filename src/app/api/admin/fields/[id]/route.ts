import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/admin";
import { UUID_RE, jsonError, parseJsonBody } from "@/lib/api/helpers";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("Invalid id");

  const { supabase, error } = await requireStaff();
  if (error) return error;

  const { data, error: queryError } = await supabase
    .from("football_fields")
    .select("*")
    .eq("id", id)
    .single();

  if (queryError || !data) return jsonError("Field not found", 404);
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("Invalid id");

  const { supabase, error } = await requireStaff();
  if (error) return error;

  if (!(await rateLimit(supabase, "admin-field-patch"))) {
    return jsonError("Too many requests", 429);
  }

  const { body, error: bodyError } = await parseJsonBody<Record<string, unknown>>(req);
  if (bodyError) return bodyError;

  const { data, error: updateError } = await supabase
    .from("football_fields")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (updateError) return jsonError(updateError.message, 500);
  return NextResponse.json(data);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("Invalid id");

  const { supabase, error } = await requireStaff();
  if (error) return error;

  if (!(await rateLimit(supabase, "admin-field-delete"))) {
    return jsonError("Too many requests", 429);
  }

  // Soft delete: no cascading FKs point at football_fields, but deactivating
  // (not removing) keeps historical matches/reviews referencing a real row.
  const { error: updateError } = await supabase
    .from("football_fields")
    .update({ is_active: false })
    .eq("id", id);

  if (updateError) return jsonError(updateError.message, 500);
  return NextResponse.json({ success: true });
}
