import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { supabase, user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { endpoint } = await req.json();
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
