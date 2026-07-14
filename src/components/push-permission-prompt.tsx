"use client";

import { useState, useEffect } from "react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";

export function PushPermissionPrompt() {
  const { isSupported, permission, isSubscribed, loading, subscribe } = usePushNotifications();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (loading || !isSupported || permission !== "default" || isSubscribed) return;

    // Check if user has dismissed this prompt
    const dismissedAt = localStorage.getItem("nf-push-prompt-dismissed");
    if (dismissedAt) {
      const daysSinceDismiss = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < 7) return; // Don't show again for 7 days
    }

    // Show after a short delay
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, [isSupported, permission, isSubscribed, loading]);

  function handleDismiss() {
    setShow(false);
    setDismissed(true);
    localStorage.setItem("nf-push-prompt-dismissed", String(Date.now()));
  }

  async function handleAllow() {
    const success = await subscribe();
    setShow(false);
    if (success) {
      localStorage.removeItem("nf-push-prompt-dismissed");
    }
  }

  if (!show || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-24 left-4 right-4 z-50 md:left-auto md:right-6 md:bottom-6 md:w-[380px]"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <div className="bg-card border shadow-xl rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-0.5">Stay in the game</p>
              <p className="text-xs text-muted-foreground">
                Get notified about join requests, match reminders, and updates — even when the app is closed.
              </p>
            </div>
            <button onClick={handleDismiss} className="shrink-0 p-1 -mt-1 -mr-1">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 rounded-xl text-xs"
              onClick={handleDismiss}
            >
              Not now
            </Button>
            <Button
              size="sm"
              className="flex-1 h-9 rounded-xl text-xs"
              onClick={handleAllow}
            >
              Enable notifications
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
