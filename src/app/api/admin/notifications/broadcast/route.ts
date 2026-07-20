import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin";
import { jsonError, parseJsonBody } from "@/lib/api/helpers";
import { rateLimit } from "@/lib/rate-limit";
import { notifyUsers } from "@/lib/notify";

export async function GET() {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { data, error: queryError } = await supabase
    .from("broadcast_notifications")
    .select("id, title, message, scheduled_for, sent_at, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  if (queryError) return jsonError(queryError.message, 500);
  return NextResponse.json({ broadcasts: data ?? [] });
}

interface BroadcastBody {
  title: string;
  message: string;
  scheduled_for?: string | null;
}

export async function POST(req: Request) {
  const { supabase, user, error } = await requireAdmin();
  if (error) return error;

  if (!(await rateLimit(supabase, "admin-broadcast"))) {
    return jsonError("Too many requests", 429);
  }

  const { body, error: bodyError } = await parseJsonBody<BroadcastBody>(req);
  if (bodyError) return bodyError;

  if (!body.title?.trim() || !body.message?.trim()) {
    return jsonError("Title and message are required");
  }

  const isScheduled = !!body.scheduled_for && new Date(body.scheduled_for) > new Date();

  const { data: broadcast, error: insertError } = await supabase
    .from("broadcast_notifications")
    .insert({
      created_by: user.id,
      title: body.title.trim(),
      message: body.message.trim(),
      scheduled_for: isScheduled ? body.scheduled_for : null,
      sent_at: isScheduled ? null : new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) return jsonError(insertError.message, 500);

  if (!isScheduled) {
    const { data: profiles } = await supabase.from("profiles").select("id");
    const userIds = (profiles ?? []).map((p) => p.id as string);
    if (userIds.length > 0) {
      notifyUsers(userIds, {
        title: broadcast.title,
        message: broadcast.message,
        pushUrl: "/dashboard/notifications",
        skipEmail: false,
      }).catch(() => {});
    }
  }

  return NextResponse.json(broadcast, { status: 201 });
}
