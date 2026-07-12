"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Calendar, UserCheck, Star, TrendingUp, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface AdminStats {
  totalUsers: number;
  totalMatches: number;
  openMatches: number;
  completedMatches: number;
  totalJoinRequests: number;
  pendingRequests: number;
  acceptedRequests: number;
  totalReviews: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <p className="font-medium text-lg">Access Denied</p>
        <p className="text-sm text-muted-foreground mt-1">You don&apos;t have admin access.</p>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500" },
    { label: "Total Matches", value: stats.totalMatches, icon: Calendar, color: "text-primary" },
    { label: "Open Matches", value: stats.openMatches, icon: TrendingUp, color: "text-green-500" },
    { label: "Completed", value: stats.completedMatches, icon: Calendar, color: "text-muted-foreground" },
    { label: "Join Requests", value: stats.totalJoinRequests, icon: UserCheck, color: "text-amber-500" },
    { label: "Pending", value: stats.pendingRequests, icon: Clock, color: "text-orange-500" },
    { label: "Accepted", value: stats.acceptedRequests, icon: UserCheck, color: "text-green-500" },
    { label: "Reviews", value: stats.totalReviews, icon: Star, color: "text-amber-500" },
  ];

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">
          Admin Dashboard
        </h1>
        <Badge variant="secondary">Admin</Badge>
      </div>

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
    </motion.div>
  );
}
