"use client";

import { useState } from "react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { motion } from "framer-motion";
import { Bell, BellOff, BellRing, Mail, Check } from "lucide-react";

interface NotificationPreferencesProps {
  userId: string;
}

export function NotificationPreferences({ userId }: NotificationPreferencesProps) {
  const { isSupported, permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();
  const [pushEnabled, setPushEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    const prefs = localStorage.getItem(`nf-notif-prefs-${userId}`);
    return prefs ? JSON.parse(prefs).push ?? false : false;
  });
  const [emailEnabled, setEmailEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const prefs = localStorage.getItem(`nf-notif-prefs-${userId}`);
    return prefs ? JSON.parse(prefs).email ?? true : true;
  });
  const [saving, setSaving] = useState(false);

  async function handlePushToggle() {
    setSaving(true);
    try {
      if (pushEnabled) {
        await unsubscribe();
        setPushEnabled(false);
      } else {
        const success = await subscribe();
        if (success) setPushEnabled(true);
      }
      localStorage.setItem(`nf-notif-prefs-${userId}`, JSON.stringify({ push: !pushEnabled, email: emailEnabled }));
    } finally {
      setSaving(false);
    }
  }

  function handleEmailToggle() {
    const newVal = !emailEnabled;
    setEmailEnabled(newVal);
    localStorage.setItem(`nf-notif-prefs-${userId}`, JSON.stringify({ push: pushEnabled, email: newVal }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Bell className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Notification Settings</p>
      </div>

      {/* Push Notifications */}
      <motion.div
        className="bg-card border rounded-2xl p-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              {pushEnabled ? (
                <BellRing className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold">Push Notifications</p>
              <p className="text-xs text-muted-foreground">
                {isSupported
                  ? isSubscribed
                    ? "Enabled — get notified even when the app is closed"
                    : "Get notified about matches and requests"
                  : "Not supported in this browser"}
              </p>
            </div>
          </div>
          <button
            onClick={handlePushToggle}
            disabled={!isSupported || loading || saving}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              pushEnabled ? "bg-primary" : "bg-muted"
            } ${!isSupported ? "opacity-50" : ""}`}
          >
            <motion.div
              className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm"
              animate={{ left: pushEnabled ? 24 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        {permission === "denied" && (
          <p className="text-xs text-destructive mt-2 ml-13">
            Notifications are blocked. Please enable them in your browser settings.
          </p>
        )}
      </motion.div>

      {/* Email Notifications */}
      <motion.div
        className="bg-card border rounded-2xl p-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">Email Notifications</p>
              <p className="text-xs text-muted-foreground">
                Receive important updates via email
              </p>
            </div>
          </div>
          <button
            onClick={handleEmailToggle}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              emailEnabled ? "bg-primary" : "bg-muted"
            }`}
          >
            <motion.div
              className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm"
              animate={{ left: emailEnabled ? 24 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </motion.div>

      {/* What you'll be notified about */}
      <motion.div
        className="bg-card border rounded-2xl p-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          You&apos;ll be notified about
        </p>
        <div className="space-y-2.5">
          {[
            "Join request received",
            "Join request accepted or rejected",
            "Match starting soon",
            "Match cancelled",
            "Match reminder (1 hour before)",
            "New match in your area",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2.5">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
