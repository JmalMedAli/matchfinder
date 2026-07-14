"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useMatches } from "@/hooks/use-matches";
import { useJoinRequests, useIncomingJoinRequests } from "@/hooks/use-join-requests";
import { useProfile } from "@/hooks/use-profile";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlayerLeaderboard } from "@/components/player-leaderboard";
import { ActivityFeed } from "@/components/activity-feed";
import { PopularFields } from "@/components/popular-fields";
import {
  Calendar, MapPin, Plus, Users, ChevronRight,
  Shield, Clock, CheckCircle, Hourglass, XCircle, Zap,
  ArrowRight, Search, List, Trophy, Activity, Building2
} from "lucide-react";
import { motion } from "framer-motion";

const statusDot: Record<string, string> = {
  OPEN: "bg-green-500",
  FULL: "bg-amber-500",
  CLOSED: "bg-muted-foreground/40",
  COMPLETED: "bg-muted-foreground/20",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const { data: profile } = useProfile();
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
  const totalPending = pendingIncoming.length + pendingRequests.length;
  const totalUpcoming = organizing.length + acceptedRequests.length;

  const isLoading = matchesPending || requestsPending || incomingPending;

  return (
    <div className="min-h-screen pb-24">
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* ── Greeting Header ── */}
          <motion.div
            className="flex items-center justify-between mb-5"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground font-medium">{getGreeting()}</p>
              <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)] truncate">
                {profile?.name?.split(" ")[0] ?? "Player"}
              </h1>
              {totalUpcoming > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalUpcoming} match{totalUpcoming !== 1 ? "es" : ""} this week
                </p>
              )}
            </div>
            <Link href="/dashboard/profile">
              <Avatar className="h-11 w-11 ring-2 ring-primary/20">
                <AvatarImage src={profile?.image ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                  {profile?.name?.[0] ?? "?"}
                </AvatarFallback>
              </Avatar>
            </Link>
          </motion.div>

          {/* ── Quick Action Pills ── */}
          <motion.div
            className="flex gap-2 mb-5 overflow-x-auto scrollbar-none"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <Link href="/dashboard/matches/new" className="shrink-0">
              <div className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-full text-sm font-semibold active:scale-95 transition-transform">
                <Plus className="h-4 w-4" />
                Create match
              </div>
            </Link>
            <Link href="/dashboard/nearby" className="shrink-0">
              <div className="flex items-center gap-1.5 bg-muted px-4 py-2.5 rounded-full text-sm font-medium active:scale-95 transition-transform">
                <Search className="h-4 w-4" />
                Browse
              </div>
            </Link>
            <Link href="/dashboard/my-matches" className="shrink-0">
              <div className="flex items-center gap-1.5 bg-muted px-4 py-2.5 rounded-full text-sm font-medium active:scale-95 transition-transform">
                <List className="h-4 w-4" />
                My matches
              </div>
            </Link>
            <Link href="/dashboard/fields" className="shrink-0">
              <div className="flex items-center gap-1.5 bg-muted px-4 py-2.5 rounded-full text-sm font-medium active:scale-95 transition-transform">
                <Building2 className="h-4 w-4" />
                Fields
              </div>
            </Link>
          </motion.div>

          {/* ── Popular Fields ── */}
          <motion.section
            className="mb-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                Popular Fields
              </h2>
              <Link href="/dashboard/fields" className="text-xs text-primary font-medium flex items-center gap-0.5">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <PopularFields />
          </motion.section>

          {/* ── Pending Alerts Strip ── */}
          {totalPending > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="mb-5"
            >
              <Link href={pendingIncoming.length > 0 ? `/dashboard/matches/${pendingIncoming[0]?.match_id}` : "/dashboard/my-matches"}>
                <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 active:scale-[0.98] transition-transform">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Clock className="h-4.5 w-4.5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {pendingIncoming.length > 0
                        ? `${pendingIncoming[0]?.profiles?.name ?? "Someone"} wants to join`
                        : `${pendingRequests.length} pending request${pendingRequests.length !== 1 ? "s" : ""}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {totalPending} action{totalPending !== 1 ? "s" : ""} needed
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 border-0 text-xs">
                      {totalPending}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            </motion.div>
          )}

          {/* ── Upcoming Matches — Horizontal Scroll ── */}
          {(organizing.length > 0 || acceptedRequests.length > 0) && (
            <motion.section
              className="mb-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Upcoming
                </h2>
                <Link href="/dashboard/my-matches" className="text-xs text-primary font-medium flex items-center gap-0.5">
                  See all <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
                {organizing.map((match, i) => (
                  <UpcomingCard key={match.id} match={match} index={i} role="organizer" />
                ))}
                {acceptedRequests.map((req, i) => (
                  <UpcomingPlayingCard key={req.id} request={req} index={organizing.length + i} />
                ))}
              </div>
            </motion.section>
          )}

          {/* ── My Matches — Compact List ── */}
          {organizing.length > 0 && (
            <motion.section
              className="mb-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  Organizing
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{organizing.length}</span>
                </h2>
                <Link href="/dashboard/my-matches" className="text-xs text-primary font-medium flex items-center gap-0.5">
                  Manage <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {organizing.map((match, i) => (
                  <CompactMatchRow key={match.id} match={match} index={i} />
                ))}
              </div>
            </motion.section>
          )}

          {/* ── Playing In — Compact List ── */}
          {acceptedRequests.length > 0 && (
            <motion.section
              className="mb-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  Playing in
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{acceptedRequests.length}</span>
                </h2>
              </div>
              <div className="space-y-2">
                {acceptedRequests.map((req, i) => (
                  <CompactPlayingRow key={req.id} request={req} index={i} />
                ))}
              </div>
            </motion.section>
          )}

          {/* ── Nearby — Compact List ── */}
          {nearby.length > 0 && (
            <motion.section
              className="mb-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  Nearby
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{nearby.length}</span>
                </h2>
                <Link href="/dashboard/nearby" className="text-xs text-primary font-medium flex items-center gap-0.5">
                  Browse all <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {nearby.slice(0, 5).map((match, i) => (
                  <CompactMatchRow key={match.id} match={match} index={i} />
                ))}
              </div>
            </motion.section>
          )}

          {/* ── Leaderboard ── */}
          <motion.section
            className="mb-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.35 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                Top Players
              </h2>
            </div>
            <PlayerLeaderboard />
          </motion.section>

          {/* ── Activity Feed ── */}
          <motion.section
            className="mb-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary" />
                Recent Activity
              </h2>
            </div>
            <ActivityFeed />
          </motion.section>

          {/* ── Empty State ── */}
          {organizing.length === 0 && acceptedRequests.length === 0 && pendingIncoming.length === 0 && pendingRequests.length === 0 && nearby.length === 0 && (
            <motion.div
              className="flex flex-col items-center py-20 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <motion.div
                className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-5"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Calendar className="h-10 w-10 text-primary/60" />
              </motion.div>
              <p className="font-semibold text-lg mb-1">No matches yet</p>
              <p className="text-sm text-muted-foreground mb-6 max-w-[260px]">
                Create your first match or browse nearby games to get started
              </p>
              <div className="flex gap-3">
                <Link href="/dashboard/matches/new">
                  <div className="flex items-center gap-1.5 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold active:scale-95 transition-transform">
                    <Plus className="h-4 w-4" />
                    Create match
                  </div>
                </Link>
                <Link href="/dashboard/fields">
                  <div className="flex items-center gap-1.5 bg-muted px-5 py-2.5 rounded-full text-sm font-medium active:scale-95 transition-transform">
                    <Building2 className="h-4 w-4" />
                    Browse fields
                  </div>
                </Link>
                <Link href="/dashboard/nearby">
                  <div className="flex items-center gap-1.5 bg-muted px-5 py-2.5 rounded-full text-sm font-medium active:scale-95 transition-transform">
                    Browse
                  </div>
                </Link>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════ */

function UpcomingCard({
  match,
  index,
  role,
}: {
  match: { id: string; title: string; date: string; location: string; max_players: number; status: string; join_requests?: { status: string }[] };
  index: number;
  role: "organizer" | "player";
}) {
  const acceptedCount = (match.join_requests ?? []).filter((r) => r.status === "ACCEPTED").length;
  const spotsLeft = match.max_players - acceptedCount;
  const date = new Date(match.date);
  const dot = statusDot[match.status] ?? "bg-muted-foreground/20";

  return (
    <motion.div
      className="shrink-0 w-[200px]"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <Link href={`/dashboard/matches/${match.id}`}>
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-dark-navy to-dark-navy/90 p-4 h-[160px] flex flex-col justify-between active:scale-[0.97] transition-transform">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Status dot */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              <span className="text-[10px] font-medium text-white/70 uppercase tracking-wider">
                {role === "organizer" ? "Organizing" : "Playing"}
              </span>
            </div>
            {role === "organizer" && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/15 text-white border-0 h-5">
                {match.status}
              </Badge>
            )}
          </div>

          {/* Bottom content */}
          <div className="relative z-10">
            <p className="text-white font-bold text-lg font-[family-name:var(--font-barlow-condensed)] truncate leading-tight">
              {match.title}
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-white/70 text-xs">
                <Calendar className="h-3 w-3" />
                {date.toLocaleDateString("en", { month: "short", day: "numeric" })} · {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="flex items-center gap-1 text-white/60 text-xs truncate max-w-[120px]">
                <MapPin className="h-3 w-3 shrink-0" />
                {match.location}
              </span>
              <span className="flex items-center gap-1 text-xs">
                <Users className="h-3 w-3 text-white/50" />
                <span className={spotsLeft === 0 ? "text-white/50" : "text-primary font-semibold"}>
                  {acceptedCount}/{match.max_players}
                </span>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function UpcomingPlayingCard({
  request,
  index,
}: {
  request: { id: string; match_id: string; matches?: Record<string, unknown> };
  index: number;
}) {
  const match = request.matches as { title: string; date: string; location: string; max_players: number; status: string; join_requests?: { status: string }[] } | undefined;
  if (!match) return null;
  const acceptedCount = (match.join_requests ?? []).filter((r) => r.status === "ACCEPTED").length;
  const spotsLeft = match.max_players - acceptedCount;
  const date = new Date(match.date);
  const dot = statusDot[match.status] ?? "bg-muted-foreground/20";

  return (
    <motion.div
      className="shrink-0 w-[200px]"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <Link href={`/dashboard/matches/${request.match_id}`}>
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/90 to-primary/70 p-4 h-[160px] flex flex-col justify-between active:scale-[0.97] transition-transform">
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          <div className="relative z-10 flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${dot}`} />
            <span className="text-[10px] font-medium text-white/80 uppercase tracking-wider">
              Playing
            </span>
          </div>

          <div className="relative z-10">
            <p className="text-white font-bold text-lg font-[family-name:var(--font-barlow-condensed)] truncate leading-tight">
              {match.title}
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-white/70 text-xs">
                <Calendar className="h-3 w-3" />
                {date.toLocaleDateString("en", { month: "short", day: "numeric" })} · {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="flex items-center gap-1 text-white/60 text-xs truncate max-w-[120px]">
                <MapPin className="h-3 w-3 shrink-0" />
                {match.location}
              </span>
              <span className="flex items-center gap-1 text-xs">
                <Users className="h-3 w-3 text-white/50" />
                <span className="text-white font-semibold">
                  {acceptedCount}/{match.max_players}
                </span>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function CompactMatchRow({
  match,
  index,
}: {
  match: { id: string; title: string; date: string; location: string; max_players: number; status: string; join_requests?: { status: string }[] };
  index: number;
}) {
  const acceptedCount = (match.join_requests ?? []).filter((r) => r.status === "ACCEPTED").length;
  const spotsLeft = match.max_players - acceptedCount;
  const date = new Date(match.date);
  const dot = statusDot[match.status] ?? "bg-muted-foreground/20";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <Link href={`/dashboard/matches/${match.id}`}>
        <div className="flex items-center gap-3 bg-card border rounded-xl p-3 active:scale-[0.98] transition-transform">
          {/* Date block */}
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
            <span className="text-base font-bold text-primary leading-none">
              {date.getDate()}
            </span>
            <span className="text-[9px] font-medium text-primary/60 uppercase">
              {date.toLocaleString("default", { month: "short" })}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${dot} shrink-0`} />
              <p className="text-sm font-semibold truncate">{match.title}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-0.5">
                <Calendar className="h-3 w-3" />
                {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="flex items-center gap-0.5 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{match.location}</span>
              </span>
            </div>
          </div>

          {/* Players */}
          <div className="text-right shrink-0">
            <span className={`text-sm font-bold ${spotsLeft === 0 ? "text-muted-foreground" : "text-primary"}`}>
              {acceptedCount}/{match.max_players}
            </span>
            <p className="text-[10px] text-muted-foreground">
              {spotsLeft === 0 ? "Full" : `${spotsLeft} left`}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function CompactPlayingRow({
  request,
  index,
}: {
  request: { id: string; match_id: string; matches?: Record<string, unknown> };
  index: number;
}) {
  const match = request.matches as { title: string; date: string; location: string; max_players: number; status: string; join_requests?: { status: string }[] } | undefined;
  if (!match) return null;
  const acceptedCount = (match.join_requests ?? []).filter((r) => r.status === "ACCEPTED").length;
  const date = new Date(match.date);
  const dot = statusDot[match.status] ?? "bg-muted-foreground/20";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <Link href={`/dashboard/matches/${request.match_id}`}>
        <div className="flex items-center gap-3 bg-card border rounded-xl p-3 active:scale-[0.98] transition-transform">
          <div className="h-11 w-11 rounded-xl bg-green-500/10 flex flex-col items-center justify-center shrink-0">
            <span className="text-base font-bold text-green-600 leading-none">
              {date.getDate()}
            </span>
            <span className="text-[9px] font-medium text-green-600/60 uppercase">
              {date.toLocaleString("default", { month: "short" })}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${dot} shrink-0`} />
              <p className="text-sm font-semibold truncate">{match.title}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-0.5">
                <Calendar className="h-3 w-3" />
                {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="flex items-center gap-0.5 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{match.location}</span>
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-sm font-bold text-green-600">
              {acceptedCount}/{match.max_players}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-11 w-11 rounded-full" />
      </div>

      {/* Pills */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>

      {/* Horizontal cards */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-20" />
        <div className="flex gap-3">
          <Skeleton className="shrink-0 w-[200px] h-[160px] rounded-2xl" />
          <Skeleton className="shrink-0 w-[200px] h-[160px] rounded-2xl" />
        </div>
      </div>

      {/* List rows */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
