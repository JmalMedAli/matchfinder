"use client";

import { useJoinRequests, useWithdrawJoinRequest } from "@/hooks/use-join-requests";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle, Hourglass, XCircle, Calendar, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const requestStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
  PENDING: { label: "Pending", variant: "secondary", icon: Hourglass },
  ACCEPTED: { label: "Accepted", variant: "default", icon: CheckCircle },
  REJECTED: { label: "Rejected", variant: "destructive", icon: XCircle },
};

export default function MyMatchesPage() {
  const { data: requests, isPending } = useJoinRequests();
  const withdrawRequest = useWithdrawJoinRequest();

  if (isPending) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  const accepted = requests?.filter((r) => r.status === "ACCEPTED") ?? [];
  const pending = requests?.filter((r) => r.status === "PENDING") ?? [];
  const rejected = requests?.filter((r) => r.status === "REJECTED") ?? [];

  function renderList(items: typeof requests, showWithdraw = false) {
    if (!items?.length) {
      return (
        <div className="text-center py-8 text-sm text-muted-foreground">
          None
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {items.map((r) => {
          const status = requestStatusConfig[r.status] ?? { label: r.status, variant: "outline" as const, icon: Hourglass };
          const StatusIcon = status.icon;
          const date = r.matches ? new Date(r.matches.date) : null;
          return (
            <Card key={r.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link href={`/dashboard/matches/${r.match_id}`} className="font-semibold hover:text-primary transition-colors">
                      {r.matches?.title ?? "Match"}
                    </Link>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      {date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {date.toLocaleDateString()}
                        </span>
                      )}
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{r.matches?.location}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={status.variant} className="gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                    {showWithdraw && r.status === "PENDING" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={withdrawRequest.isPending}
                        onClick={() => {
                          withdrawRequest.mutate(r.id, {
                            onSuccess: () => toast.success("Request withdrawn"),
                            onError: (err) => toast.error(err.message),
                          });
                        }}
                      >
                        Withdraw
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">
        My Matches
      </h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5">
          <CheckCircle className="h-4 w-4" />
          Accepted
        </h2>
        {renderList(accepted)}
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Hourglass className="h-4 w-4" />
          Pending
        </h2>
        {renderList(pending, true)}
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <XCircle className="h-4 w-4" />
          Rejected
        </h2>
        {renderList(rejected)}
      </section>
    </motion.div>
  );
}
