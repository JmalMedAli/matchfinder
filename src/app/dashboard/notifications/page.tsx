"use client";

import { useNotifications, useMarkNotificationsRead } from "@/hooks/use-notifications";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsPage() {
  const { data: notifications, isPending } = useNotifications();
  const markRead = useMarkNotificationsRead();

  if (isPending) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unread.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markRead.isPending}>
            Mark all as read
          </Button>
        )}
      </div>

      {unread.length === 0 && read.length === 0 && (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <Bell className="h-12 w-12 mb-4 opacity-50" />
          <p>No notifications yet</p>
        </div>
      )}

      {unread.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase">Unread</h2>
          {unread.map((n) => (
            <Card key={n.id} className="border-primary/20 bg-primary/5">
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge>NEW</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {read.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase">Read</h2>
          {read.map((n) => (
            <Card key={n.id}>
              <CardContent className="py-3">
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
