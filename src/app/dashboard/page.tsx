"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useMatches } from "@/hooks/use-matches";
import { useJoinRequests, useIncomingJoinRequests } from "@/hooks/use-join-requests";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Calendar, MapPin, PlusCircle, Users, ArrowRight, Zap,
  Shield, Clock, CheckCircle, Hourglass, XCircle, Eye
} from "lucide-react";
import { motion } from "framer-motion";

const requestStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
  PENDING: { label: "Pending", variant: "secondary", icon: Hourglass },
  ACCEPTED: { label: "Accepted", variant: "default", icon: CheckCircle },
  REJECTED: { label: "Rejected", variant: "destructive", icon: XCircle },
};

export default function DashboardPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const { data: allMatches, isPending: matchesPending } = useMatches({ pageSize: 50 });
  const { data: myRequests, isPending: requestsPending } = useJoinRequests();
  const { data: incomingRequests, isPending: incomingPending } = useIncomingJoinRequests();

  const loadUser = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    } catch {
      // Supabase not configured
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const organizing = (allMatches?.matches ?? []).filter((m) => userId && m.organizer_id === userId);
  const acceptedRequests = (myRequests ?? []).filter((r) => r.status === "ACCEPTED");
  const pendingRequests = (myRequests ?? []).filter((r) => r.status === "PENDING");
  const nearby = (allMatches?.matches ?? []).filter((m) => userId && m.organizer_id !== userId);
  const pendingIncoming = incomingRequests ?? [];

  const isLoading = matchesPending || requestsPending || incomingPending;

  return (
    <div className="space-y-8">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">
            Dashboard
          </h1>
          <p className="text-muted-foreground">Your football home.</p>
        </div>
        <Link href="/dashboard/matches/new">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Create match
          </Button>
        </Link>
      </motion.div>

      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-28 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {organizing.length > 0 && (
            <DashboardSection
              icon={<Shield className="h-5 w-5 text-primary" />}
              title="Matches I'm Organizing"
              count={organizing.length}
              linkHref="/dashboard/my-matches"
              linkLabel="Manage"
            >
              {organizing.map((match, i) => {
                const acceptedCount = (match.join_requests ?? []).filter(
                  (r: any) => r.status === "ACCEPTED",
                ).length;
                const spotsLeft = match.max_players - acceptedCount;
                const date = new Date(match.date);
                const status = match.status;

                return (
                  <MatchCard
                    key={match.id}
                    match={match}
                    index={i}
                    date={date}
                    acceptedCount={acceptedCount}
                    spotsLeft={spotsLeft}
                    badge={
                      <Badge variant={status === "OPEN" ? "default" : status === "FULL" ? "secondary" : "outline"}>
                        {status}
                      </Badge>
                    }
                  />
                );
              })}
            </DashboardSection>
          )}

          {acceptedRequests.length > 0 && (
            <DashboardSection
              icon={<CheckCircle className="h-5 w-5 text-green-500" />}
              title="Matches I'm Playing"
              count={acceptedRequests.length}
              linkHref="/dashboard/my-matches"
              linkLabel="View all"
            >
              {acceptedRequests.map((req, i) => {
                const date = req.matches ? new Date(req.matches.date) : null;
                return (
                  <PlayingMatchCard key={req.id} request={req} index={i} date={date} />
                );
              })}
            </DashboardSection>
          )}

          {(pendingIncoming.length > 0 || pendingRequests.length > 0) && (
            <DashboardSection
              icon={<Clock className="h-5 w-5 text-amber-500" />}
              title="Pending Actions"
              count={pendingIncoming.length + pendingRequests.length}
            >
              {pendingIncoming.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Incoming requests</p>
                  {pendingIncoming.map((req, i) => {
                    const date = req.matches ? new Date(req.matches.date) : null;
                    return (
                      <IncomingRequestCard key={req.id} request={req} index={i} date={date} />
                    );
                  })}
                </div>
              )}
              {pendingRequests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your pending requests</p>
                  {pendingRequests.map((req, i) => {
                    const date = req.matches ? new Date(req.matches.date) : null;
                    return (
                      <PlayingMatchCard key={req.id} request={req} index={i} date={date} showStatus />
                    );
                  })}
                </div>
              )}
            </DashboardSection>
          )}

          {nearby.length > 0 && (
            <DashboardSection
              icon={<Zap className="h-5 w-5 text-primary" />}
              title="Nearby Matches"
              count={nearby.length}
              linkHref="/dashboard/nearby"
              linkLabel="Browse all"
            >
              {nearby.slice(0, 5).map((match, i) => {
                const acceptedCount = (match.join_requests ?? []).filter(
                  (r: any) => r.status === "ACCEPTED",
                ).length;
                const spotsLeft = match.max_players - acceptedCount;
                const date = new Date(match.date);

                return (
                  <MatchCard
                    key={match.id}
                    match={match}
                    index={i}
                    date={date}
                    acceptedCount={acceptedCount}
                    spotsLeft={spotsLeft}
                  />
                );
              })}
            </DashboardSection>
          )}

          {organizing.length === 0 && acceptedRequests.length === 0 && pendingIncoming.length === 0 && pendingRequests.length === 0 && nearby.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <motion.div
                  className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Calendar className="h-7 w-7 text-muted-foreground" />
                </motion.div>
                <p className="text-muted-foreground font-medium mb-1">No matches yet</p>
                <p className="text-sm text-muted-foreground/70 mb-4">Create your first match to get started</p>
                <Link href="/dashboard/matches/new">
                  <Button size="sm" className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Create match
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function DashboardSection({
  icon,
  title,
  count,
  linkHref,
  linkLabel,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  linkHref?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      className="space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold font-[family-name:var(--font-barlow-condensed)] flex items-center gap-2">
          {icon}
          {title}
          <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
        </h2>
        {linkHref && (
          <Link href={linkHref} className="text-sm text-primary hover:underline flex items-center gap-1">
            {linkLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </motion.section>
  );
}

function MatchCard({
  match,
  index,
  date,
  acceptedCount,
  spotsLeft,
  badge,
}: {
  match: any;
  index: number;
  date: Date;
  acceptedCount: number;
  spotsLeft: number;
  badge?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={`/dashboard/matches/${match.id}`}>
        <Card className="hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
              <span className="text-lg font-bold text-primary leading-none">
                {date.getDate()}
              </span>
              <span className="text-[10px] font-medium text-primary/70 uppercase">
                {date.toLocaleString("default", { month: "short" })}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate">{match.title}</p>
                {badge}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{match.location}</span>
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-sm">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className={spotsLeft === 0 ? "text-muted-foreground" : "text-primary font-medium"}>
                  {acceptedCount}/{match.max_players}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {spotsLeft === 0 ? "Full" : `${spotsLeft} spot${spotsLeft > 1 ? "s" : ""} left`}
              </p>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

function PlayingMatchCard({
  request,
  index,
  date,
  showStatus = false,
}: {
  request: any;
  index: number;
  date: Date | null;
  showStatus?: boolean;
}) {
  const status = requestStatusConfig[request.status] ?? { label: request.status, variant: "outline" as const, icon: Hourglass };
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={`/dashboard/matches/${request.match_id}`}>
        <Card className="hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer">
          <CardContent className="p-4 flex items-center gap-4">
            {date && (
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                <span className="text-lg font-bold text-primary leading-none">
                  {date.getDate()}
                </span>
                <span className="text-[10px] font-medium text-primary/70 uppercase">
                  {date.toLocaleString("default", { month: "short" })}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{request.matches?.title ?? "Match"}</p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                {date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{request.matches?.location}</span>
                </span>
              </div>
            </div>
            {showStatus && (
              <Badge variant={status.variant} className="gap-1 shrink-0">
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

function IncomingRequestCard({
  request,
  index,
  date,
}: {
  request: any;
  index: number;
  date: Date | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={`/dashboard/matches/${request.match_id}`}>
        <Card className="hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer">
          <CardContent className="p-4 flex items-center gap-4">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={request.profiles?.image ?? undefined} />
              <AvatarFallback>{request.profiles?.name?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-semibold">{request.profiles?.name ?? "Someone"}</span>
                <span className="text-muted-foreground"> wants to join </span>
                <span className="font-semibold">{request.matches?.title ?? "your match"}</span>
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                {date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {date.toLocaleDateString()}
                  </span>
                )}
                {request.profiles?.position && (
                  <span>{request.profiles.position}</span>
                )}
              </div>
            </div>
            <Badge variant="secondary" className="gap-1 shrink-0">
              <Eye className="h-3 w-3" />
              Review
            </Badge>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
