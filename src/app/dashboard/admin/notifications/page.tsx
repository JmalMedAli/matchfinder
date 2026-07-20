"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Bell, Send } from "lucide-react";
import { toast } from "sonner";

interface Broadcast {
  id: string;
  title: string;
  message: string;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
}

export default function AdminNotificationsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [sending, setSending] = useState(false);

  function fetchBroadcasts() {
    return fetch("/api/admin/notifications/broadcast")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load broadcasts");
        return r.json();
      })
      .then((data) => setBroadcasts(data.broadcasts))
      .catch(() => setError("Failed to load broadcasts."))
      .finally(() => setLoading(false));
  }

  function load() {
    setLoading(true);
    setError(null);
    fetchBroadcasts();
  }

  useEffect(() => { fetchBroadcasts(); }, []);

  async function send() {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setSending(true);
    const res = await fetch("/api/admin/notifications/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        message,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      }),
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to send");
      return;
    }
    toast.success(scheduledFor ? "Broadcast scheduled" : "Broadcast sent to all players");
    setTitle("");
    setMessage("");
    setScheduledFor("");
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">Notifications</h1>

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="font-semibold text-sm">Broadcast to all players</p>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New feature: field bookings" />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Schedule for later (optional)</Label>
            <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
          </div>
          <Button onClick={send} disabled={sending}>
            <Send className="h-4 w-4" /> {sending ? "Sending…" : scheduledFor ? "Schedule" : "Send now"}
          </Button>
        </CardContent>
      </Card>

      <p className="font-semibold text-sm">History</p>
      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : broadcasts.length === 0 ? (
        <EmptyState icon={Bell} title="No broadcasts yet" />
      ) : (
        <div className="space-y-2">
          {broadcasts.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-medium text-sm">{b.title}</p>
                  <Badge variant={b.sent_at ? "default" : "secondary"}>
                    {b.sent_at ? "Sent" : "Scheduled"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{b.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {b.sent_at
                    ? `Sent ${new Date(b.sent_at).toLocaleString()}`
                    : `Scheduled for ${new Date(b.scheduled_for!).toLocaleString()}`}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
