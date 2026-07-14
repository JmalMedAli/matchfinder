import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push/send";

interface NotifyOptions {
  userId: string;
  title: string;
  message: string;
  matchId?: string;
  pushUrl?: string;
  pushTag?: string;
}

/**
 * Creates an in-app notification AND sends a web push notification.
 * Use this instead of supabase.rpc("create_notification", ...) for all new notifications.
 */
export async function notifyUser(opts: NotifyOptions) {
  const supabase = await createClient();

  // 1. In-app notification
  const { error } = await supabase.rpc("create_notification", {
    p_user_id: opts.userId,
    p_title: opts.title,
    p_message: opts.message,
    p_match_id: opts.matchId ?? null,
  });

  if (error) {
    console.error("Failed to create in-app notification:", error.message);
  }

  // 2. Web push notification (fire-and-forget)
  sendPushToUser(opts.userId, {
    title: opts.title,
    body: opts.message,
    url: opts.pushUrl || (opts.matchId ? `/dashboard/matches/${opts.matchId}` : "/dashboard"),
    tag: opts.pushTag || `matchfinder-${opts.matchId || "general"}`,
  }).catch(() => {
    // Push failures are non-critical
  });

  // 3. Email notification (placeholder — configure with your email provider)
  // TODO: Integrate with Resend/SendGrid/Supabase Edge Function for email
}

/**
 * Notify multiple users at once.
 */
export async function notifyUsers(
  userIds: string[],
  opts: Omit<NotifyOptions, "userId">,
) {
  await Promise.all(userIds.map((userId) => notifyUser({ ...opts, userId })));
}
