"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Calendar, UserCheck, Star, TrendingUp, Flag, MapPin, CalendarCheck } from "lucide-react";
import { motion } from "framer-motion";
import { ErrorState } from "@/components/ui/error-state";
import { ChartBar } from "@/components/admin/chart-bar";

interface GrowthPoint {
  week_start: string;
  user_count: number;
  match_count: number;
}

interface PopularCity {
  city: string;
  user_count: number;
}

interface PopularField {
  id: string;
  name: string;
  city: string;
  rating: number;
  review_count: number;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalMatches: number;
  matchesToday: number;
  completedMatches: number;
  totalFields: number;
  pendingReports: number;
  totalReviews: number;
  growth: GrowthPoint[];
  popularCities: PopularCity[];
  popularFields: PopularField[];
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function fetchStats() {
    return fetch("/api/admin/stats")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load admin stats");
        return r.json();
      })
      .then((data) => setStats(data))
      .catch(() => setErrorMsg("Failed to load admin stats."))
      .finally(() => setLoading(false));
  }

  function retry() {
    setLoading(true);
    setErrorMsg(null);
    fetchStats();
  }

  useEffect(() => { fetchStats(); }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (errorMsg || !stats) {
    return <ErrorState description={errorMsg ?? "Failed to load admin stats."} onRetry={retry} />;
  }

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500" },
    { label: "Active Users", value: stats.activeUsers, icon: UserCheck, color: "text-green-500" },
    { label: "Matches Today", value: stats.matchesToday, icon: CalendarCheck, color: "text-primary" },
    { label: "Completed Matches", value: stats.completedMatches, icon: Calendar, color: "text-muted-foreground" },
    { label: "Pending Reports", value: stats.pendingReports, icon: Flag, color: "text-red-500" },
    { label: "Football Fields", value: stats.totalFields, icon: MapPin, color: "text-amber-500" },
    { label: "Total Matches", value: stats.totalMatches, icon: TrendingUp, color: "text-orange-500" },
    { label: "Reviews", value: stats.totalReviews, icon: Star, color: "text-amber-500" },
  ];

  const weekLabels = stats.growth.map((g) =>
    new Date(g.week_start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  );

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">Overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">
                        {stat.value}
                      </p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="font-semibold text-sm mb-3">Growth — last 8 weeks</p>
            <ChartBar
              categories={weekLabels}
              series={[
                { label: "New users", color: "chart-1" },
                { label: "New matches", color: "chart-2" },
              ]}
              values={[
                stats.growth.map((g) => g.user_count),
                stats.growth.map((g) => g.match_count),
              ]}
            />
          </CardContent>
        </Card>

        <div className="grid grid-rows-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="font-semibold text-sm mb-3">Popular cities</p>
              {stats.popularCities.length === 0 ? (
                <p className="text-xs text-muted-foreground">No city data yet</p>
              ) : (
                <div className="space-y-2">
                  {stats.popularCities.map((c) => (
                    <div key={c.city} className="flex items-center justify-between text-sm">
                      <span>{c.city}</span>
                      <span className="text-muted-foreground">{c.user_count} players</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="font-semibold text-sm mb-3">Popular fields</p>
              {stats.popularFields.length === 0 ? (
                <p className="text-xs text-muted-foreground">No field reviews yet</p>
              ) : (
                <div className="space-y-2">
                  {stats.popularFields.map((f) => (
                    <div key={f.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{f.name}</span>
                      <span className="text-muted-foreground shrink-0">
                        {f.rating > 0 ? `${f.rating.toFixed(1)}★` : "—"} · {f.review_count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
