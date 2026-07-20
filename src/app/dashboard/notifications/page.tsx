"use client";

import { useRouter } from "next/navigation";
import { useNotifications, useMarkNotificationsRead } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import type { Notification } from "@/hooks/use-notifications";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

function timeGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (d >= startOfToday) return "Today";
  if (d >= startOfYesterday) return "Yesterday";
  if (now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000) return "This week";
  return "Earlier";
}

export default function NotificationsPage() {
  const router = useRouter();
  const { data: notifications, isPending, error, refetch } = useNotifications();
  const markRead = useMarkNotificationsRead();

  if (isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState description="Failed to load notifications." onRetry={() => refetch()} />;
  }

  const unread = notifications?.filter((n) => !n.read) ?? [];
  const read = notifications?.filter((n) => n.read) ?? [];

  function handleMarkAllRead() {
    markRead.mutate(undefined);
  }

  function handleNotificationClick(n: Notification) {
    if (!n.match_id) return;
    if (!n.read) {
      markRead.mutate([n.id], {
        onSuccess: () => {
          router.push(`/dashboard/matches/${n.match_id}`);
        },
      });
    } else {
      router.push(`/dashboard/matches/${n.match_id}`);
    }
  }

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)]">
            Notifications
          </h1>
        </div>
        {unread.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markRead.isPending}
            className="gap-1.5 text-primary h-8"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* ── Empty State ── */}
      {unread.length === 0 && read.length === 0 && (
        <EmptyState icon={Bell} title="No notifications yet" description="You'll see updates about your matches here." />
      )}

      {/* ── Unread ── */}
      {unread.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-primary uppercase tracking-wider px-1">New</h2>
          {unread.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
              whileTap={n.match_id ? { scale: 0.98 } : undefined}
            >
              <button
                type="button"
                onClick={() => handleNotificationClick(n)}
                className={`w-full text-left flex items-start gap-3 p-3.5 bg-primary/5 border border-primary/15 rounded-2xl active:bg-primary/10 transition-colors ${
                  n.match_id ? "cursor-pointer" : "cursor-default"
                }`}
              >
                {/* Unread dot */}
                <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5 shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-snug">{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>

                {n.match_id && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-0.5" />
                )}
              </button>
            </motion.div>
          ))}
        </section>
      )}

      {/* ── Read — Grouped by time ── */}
      {read.length > 0 && (() => {
        const groups: Record<string, typeof read> = {};
        for (const n of read) {
          const g = timeGroup(n.created_at);
          if (!groups[g]) groups[g] = [];
          groups[g].push(n);
        }

        return Object.entries(groups).map(([label, items]) => (
          <section key={label} className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{label}</h2>
            {items.map((n) => (
              <motion.div
                key={n.id}
                whileTap={n.match_id ? { scale: 0.98 } : undefined}
              >
                <button
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left flex items-start gap-3 p-3.5 bg-card border rounded-2xl hover:bg-muted/30 transition-colors ${
                    n.match_id ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-snug">{n.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  {n.match_id && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-0.5" />
                  )}
                </button>
              </motion.div>
            ))}
          </section>
        ));
      })()}
    </motion.div>
  );
}
