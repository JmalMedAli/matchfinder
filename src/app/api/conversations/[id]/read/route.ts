import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireAuth } from "@/lib/api/helpers";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  const { error } = await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("user_id", user.id);

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ success: true });
}
