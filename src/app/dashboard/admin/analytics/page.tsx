"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { ChartBar } from "@/components/admin/chart-bar";
import { Repeat2 } from "lucide-react";

interface Analytics {
  growth: { week_start: string; user_count: number; match_count: number }[];
  popularCities: { city: string; user_count: number }[];
  topOrganizers: { organizer_id: string; name: string; match_count: number }[];
  topFields: { id: string; name: string; city: string; rating: number; review_count: number }[];
  retention: { playedAtLeastOnce: number; playedMoreThanOnce: number; retentionRate: number };
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function fetchAnalytics() {
    return fetch("/api/admin/analytics")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load analytics");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Failed to load analytics."))
      .finally(() => setLoading(false));
  }

  function reload() {
    setLoading(true);
    setError(null);
    fetchAnalytics();
  }

  useEffect(() => { fetchAnalytics(); }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 rounded-2xl" />
        <div className="grid md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState description={error ?? "Failed to load analytics."} onRetry={reload} />;
  }

  const weekLabels = data.growth.map((g) =>
    new Date(g.week_start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">Analytics</h1>

      <Card>
        <CardContent className="p-4">
          <p className="font-semibold text-sm mb-3">User &amp; match growth — last 12 weeks</p>
          <ChartBar
            categories={weekLabels}
            series={[
              { label: "New users", color: "chart-1" },
              { label: "New matches", color: "chart-2" },
            ]}
            values={[
              data.growth.map((g) => g.user_count),
              data.growth.map((g) => g.match_count),
            ]}
            height={200}
          />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="font-semibold text-sm mb-3 flex items-center gap-1.5"><Repeat2 className="h-4 w-4" /> Retention</p>
            <p className="text-3xl font-bold">{data.retention.retentionRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.retention.playedMoreThanOnce} of {data.retention.playedAtLeastOnce} players who played once played again
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="font-semibold text-sm mb-3">Most active cities</p>
            {data.popularCities.length === 0 ? (
              <p className="text-xs text-muted-foreground">No city data yet</p>
            ) : (
              <div className="space-y-2">
                {data.popularCities.map((c) => (
                  <div key={c.city} className="flex items-center justify-between text-sm">
                    <span>{c.city}</span>
                    <span className="text-muted-foreground">{c.user_count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="font-semibold text-sm mb-3">Top organizers</p>
            {data.topOrganizers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No matches organized yet</p>
            ) : (
              <div className="space-y-2">
                {data.topOrganizers.map((o) => (
                  <div key={o.organizer_id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{o.name}</span>
                    <span className="text-muted-foreground shrink-0">{o.match_count} matches</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="font-semibold text-sm mb-3">Top fields</p>
          {data.topFields.length === 0 ? (
            <p className="text-xs text-muted-foreground">No field reviews yet</p>
          ) : (
            <div className="space-y-2">
              {data.topFields.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm">
                  <span>{f.name} <span className="text-muted-foreground">({f.city})</span></span>
                  <span className="text-muted-foreground">{f.rating > 0 ? `${f.rating.toFixed(1)}★` : "—"} · {f.review_count} reviews</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
