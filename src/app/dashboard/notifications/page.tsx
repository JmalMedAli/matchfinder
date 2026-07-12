"use client";

import { useRouter } from "next/navigation";
import { useNotifications, useMarkNotificationsRead } from "@/hooks/use-notifications";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import type { Notification } from "@/hooks/use-notifications";

export default function NotificationsPage() {
  const router = useRouter();
  const { data: notifications, isPending } = useNotifications();
  const markRead = useMarkNotificationsRead();

  if (isPending) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
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
      className="space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">
          Notifications
        </h1>
        {unread.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markRead.isPending} className="gap-1.5">
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all as read
          </Button>
        )}
      </div>

      {unread.length === 0 && read.length === 0 && (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <motion.div
            className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Bell className="h-8 w-8 text-muted-foreground/50" />
          </motion.div>
          <p className="font-medium">No notifications yet</p>
          <p className="text-sm">You&apos;ll see updates about your matches here.</p>
        </div>
      )}

      {unread.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">New</h2>
          {unread.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
            >
              <motion.div whileTap={n.match_id ? { scale: 0.98 } : undefined}>
                <Card
                  className={`border-primary/20 bg-primary/5 ${n.match_id ? "cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors" : ""}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{n.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className="shrink-0">NEW</Badge>
                        {n.match_id && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          ))}
        </section>
      )}

      {read.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Earlier</h2>
          {read.map((n) => (
            <motion.div whileTap={n.match_id ? { scale: 0.98 } : undefined} key={n.id}>
              <Card
                className={`${n.match_id ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}`}
                onClick={() => handleNotificationClick(n)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                    {n.match_id && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>
      )}
    </motion.div>
  );
}
