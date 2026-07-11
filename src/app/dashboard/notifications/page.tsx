"use client";

import { useNotifications, useMarkNotificationsRead } from "@/hooks/use-notifications";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function NotificationsPage() {
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
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge className="shrink-0">NEW</Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>
      )}

      {read.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Earlier</h2>
          {read.map((n) => (
            <Card key={n.id}>
              <CardContent className="p-4">
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </motion.div>
  );
}
