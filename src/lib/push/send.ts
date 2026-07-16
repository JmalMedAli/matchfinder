import webPush from "web-push";
import { createClient } from "@/lib/supabase/server";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@matchfinder.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    VAPID_EMAIL,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string },
) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const supabase = await createClient();

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return;

  const defaultPayload = {
    title: payload.title,
    body: payload.body,
    url: payload.url || "/dashboard",
    tag: payload.tag || "matchfinder-notification",
  };

  const failedEndpoints: string[] = [];
  let delivered = false;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth_key,
          },
        };

        await webPush.sendNotification(subscription, JSON.stringify(defaultPayload));
        delivered = true;
      } catch (error: unknown) {
        const err = error as { statusCode?: number };
        if (err.statusCode === 404 || err.statusCode === 410) {
          failedEndpoints.push(sub.endpoint);
        }
      }
    }),
  );

  // Batch cleanup of expired subscriptions
  if (failedEndpoints.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", failedEndpoints);
  }

  // Log delivery for analytics
  if (delivered) {
    await supabase.from("push_delivery_log").insert({
      user_id: userId,
      title: defaultPayload.title,
      message: defaultPayload.body,
      url: defaultPayload.url,
      delivered: true,
    });
  }
}

export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string; tag?: string },
) {
  await Promise.all(userIds.map((id) => sendPushToUser(id, payload)));
}
