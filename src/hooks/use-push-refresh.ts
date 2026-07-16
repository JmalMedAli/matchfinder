"use client";

import { useEffect, useCallback } from "react";

function urlBase64ToBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

async function ensurePushSubscription(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (Notification.permission !== "granted") return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) return true; // Already subscribed

    const res = await fetch("/api/push/vapid-key");
    const { publicKey } = await res.json();
    if (!publicKey) return false;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBuffer(publicKey),
    });

    const subJson = subscription.toJSON();
    if (!subJson.keys) return false;

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      }),
    });

    return true;
  } catch {
    return false;
  }
}

export function usePushRefresh() {
  const refresh = useCallback(async () => {
    await ensurePushSubscription();
  }, []);

  useEffect(() => {
    // Refresh subscription on mount (handles key rotation, browser restart, etc.)
    refresh();
  }, [refresh]);
}
