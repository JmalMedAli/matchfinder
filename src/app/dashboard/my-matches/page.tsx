"use client";

import { useJoinRequests, useWithdrawJoinRequest } from "@/hooks/use-join-requests";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle, Hourglass, XCircle, Calendar, MapPin, ChevronRight, List } from "lucide-react";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

const requestStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
  PENDING: { label: "Pending", variant: "secondary", icon: Hourglass },
  ACCEPTED: { label: "Accepted", variant: "default", icon: CheckCircle },
  REJECTED: { label: "Rejected", variant: "destructive", icon: XCircle },
};

export default function MyMatchesPage() {
  const { data: requests, isPending, error, refetch } = useJoinRequests();
  const withdrawRequest = useWithdrawJoinRequest();

  if (isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState description="Failed to load your matches." onRetry={() => refetch()} />;
  }

  const accepted = requests?.filter((r) => r.status === "ACCEPTED") ?? [];
  const pending = requests?.filter((r) => r.status === "PENDING") ?? [];
  const rejected = requests?.filter((r) => r.status === "REJECTED") ?? [];

  function sortByDate(items: NonNullable<typeof requests>) {
    return [...items].sort((a, b) => {
      const dateA = a.matches ? new Date(a.matches.date).getTime() : 0;
      const dateB = b.matches ? new Date(b.matches.date).getTime() : 0;
      return dateA - dateB;
    });
  }

  const sortedAccepted = sortByDate(accepted);
  const sortedPending = sortByDate(pending);
  const sortedRejected = sortByDate(rejected);

  function renderList(items: typeof requests, showWithdraw = false) {
    if (!items?.length) {
      return (
        <p className="text-center py-8 text-sm text-muted-foreground/60">None</p>
      );
    }
    return (
      <div className="space-y-2">
        {items.map((r, i) => {
          const date = r.matches ? new Date(r.matches.date) : null;
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
            >
              <Link
                href={`/dashboard/matches/${r.match_id}`}
                className="flex items-center gap-3.5 p-3.5 bg-card border rounded-2xl active:scale-[0.98] transition-transform"
              >
                {/* Date pill */}
                {date && (
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-semibold text-primary uppercase leading-tight">
                      {date.toLocaleDateString("en", { month: "short" })}
                    </span>
                    <span className="text-base font-bold text-primary leading-tight">
                      {date.getDate()}
                    </span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{r.matches?.title ?? "Match"}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{r.matches?.location}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {showWithdraw && r.status === "PENDING" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] px-2"
                      disabled={withdrawRequest.isPending}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        withdrawRequest.mutate(r.id, {
                          onSuccess: () => toast.success("Request withdrawn"),
                          onError: (err) => toast.error(err.message),
                        });
                      }}
                    >
                      Withdraw
                    </Button>
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <List className="h-4 w-4 text-primary" />
        </div>
        <h1 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)]">
          My Matches
        </h1>
      </div>

      {!requests?.length ? (
        <EmptyState
          icon={List}
          title="No matches yet"
          description="Requests you send to join a match will show up here."
          action={{ label: "Browse matches", href: "/dashboard/matches" }}
        />
      ) : (
        <>
          <section className="space-y-2.5">
            <h2 className="text-xs font-semibold text-primary uppercase tracking-wider px-1 flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              Accepted
              {accepted.length > 0 && (
                <span className="text-[10px] bg-primary/10 px-1.5 py-0.5 rounded-full">{accepted.length}</span>
              )}
            </h2>
            {renderList(sortedAccepted)}
          </section>

          <section className="space-y-2.5">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-1.5">
              <Hourglass className="h-3.5 w-3.5" />
              Pending
              {pending.length > 0 && (
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{pending.length}</span>
              )}
            </h2>
            {renderList(sortedPending, true)}
          </section>

          <section className="space-y-2.5">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5" />
              Rejected
            </h2>
            {renderList(sortedRejected)}
          </section>
        </>
      )}
    </motion.div>
  );
}
