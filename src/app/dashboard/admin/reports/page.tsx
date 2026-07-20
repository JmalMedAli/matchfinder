"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Flag } from "lucide-react";
import { toast } from "sonner";

interface Report {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  description: string | null;
  status: string;
  resolved_at: string | null;
  created_at: string;
  profiles: { name: string | null; email: string | null } | null;
}

const STATUS_FILTERS = ["pending", "reviewed", "actioned", "dismissed", "all"] as const;

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "pending") return "default";
  if (status === "actioned") return "destructive";
  if (status === "dismissed") return "outline";
  return "secondary";
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    fetch(`/api/admin/reports?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load reports");
        return r.json();
      })
      .then((data) => setReports(data.reports))
      .catch(() => setError("Failed to load reports."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const handle = setTimeout(load, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function act(id: string, action: "warn" | "suspend" | "ban" | "dismiss") {
    const res = await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Action failed");
      return;
    }
    toast.success("Report resolved");
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">Reports</h1>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
              statusFilter === s
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : reports.length === 0 ? (
        <EmptyState icon={Flag} title="No reports" description="Nothing to review here." />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{r.target_type}</Badge>
                    <Badge variant={statusVariant(r.status)} className="capitalize">{r.status}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm font-medium">{r.reason}</p>
                {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                <p className="text-xs text-muted-foreground">
                  Reported by {r.profiles?.name ?? "Unknown"} ({r.profiles?.email ?? "—"}) · target id {r.target_id}
                </p>
                {r.status === "pending" && (
                  <div className="flex gap-2 pt-1 flex-wrap">
                    {r.target_type === "user" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => act(r.id, "warn")}>Warn</Button>
                        <Button size="sm" variant="outline" onClick={() => act(r.id, "suspend")}>Suspend</Button>
                        <Button size="sm" variant="destructive" onClick={() => act(r.id, "ban")}>Ban</Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => act(r.id, "dismiss")}>Dismiss</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
