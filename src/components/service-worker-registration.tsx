"use client";

import { useEffect } from "react";
import { PushPermissionPrompt } from "@/components/push-permission-prompt";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Every hour
        })
        .catch(() => {
          // SW registration failed — non-critical
        });
    }
  }, []);

  return <PushPermissionPrompt />;
}
