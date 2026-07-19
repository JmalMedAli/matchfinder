import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { supabase, user, error: authError } = await requireAuth();
  if (authError) return authError;

  if (!rateLimit(`push-subscribe:${user.id}`, { maxRequests: 5, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { endpoint, p256dh, auth } = await req.json();
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Missing subscription data" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth_key: auth,
      },
      { onConflict: "endpoint" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
