"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMatch, useDeleteMatch, useUpdateMatch } from "@/hooks/use-matches";
import { useJoinRequest, useJoinRequests, useUpdateJoinRequest, useWithdrawJoinRequest, useRemoveAcceptedPlayer } from "@/hooks/use-join-requests";
import { useRealtimeJoinRequests } from "@/hooks/use-realtime-join-requests";
import { useMatchReviews, useSubmitReview } from "@/hooks/use-reviews";
import { useMatchPhotos } from "@/hooks/use-match-photos";
import type { MatchPhoto } from "@/hooks/use-match-photos";
import { PhotoGallery } from "@/components/photo-gallery";
import { TeamPicker } from "@/components/team-picker";
import { AvailabilityPicker } from "@/components/availability-picker";
import { useMatchAvailability, useSetAvailability } from "@/hooks/use-match-availability";
import { useFootballField } from "@/hooks/use-football-fields";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { DmButton } from "@/components/dm-button";
import { PlayerProfileModal } from "@/components/player-profile-modal";
import {
  MapPin, ExternalLink, Phone, MessageCircle, Globe,
  Calendar, Clock, Users, ArrowLeft, Pencil, Trash2,
  CheckCircle, XCircle, Hourglass, MessagesSquare, Eye, Star,
  ChevronDown, ChevronUp, Archive, RotateCcw
} from "lucide-react";
import { filterPublicProfile } from "@/types/profile";
import type { MatchOrganizer } from "@/hooks/use-matches";
import { motion, AnimatePresence } from "framer-motion";

  const statusDot: Record<string, string> = {
  OPEN: "bg-green-500",
  FULL: "bg-amber-500",
  CLOSED: "bg-red-500",
  COMPLETED: "bg-muted-foreground/40",
  ARCHIVED: "bg-muted-foreground/20",
};

const requestStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
  PENDING: { label: "Pending", variant: "secondary", icon: Hourglass },
  ACCEPTED: { label: "Accepted", variant: "default", icon: CheckCircle },
  REJECTED: { label: "Rejected", variant: "destructive", icon: XCircle },
};

function CollapsibleSection({
  title,
  icon,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-2xl overflow-hidden bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 active:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-sm font-semibold">{title}</span>
          {count !== undefined && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{count}</span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const { data: match, isPending } = useMatch(id);
  const deleteMatch = useDeleteMatch();
  const updateMatch = useUpdateMatch();
  const joinRequest = useJoinRequest();
  const withdrawRequest = useWithdrawJoinRequest();
  const { data: myRequests } = useJoinRequests();
  const { mutate: updateJoinRequest, isPending: isUpdatingJoinRequest } = useUpdateJoinRequest();
  const removeAcceptedPlayer = useRemoveAcceptedPlayer();

  useRealtimeJoinRequests({ matchId: id });
  const { data: field } = useFootballField(match?.football_field_id);
  const { data: matchReviews } = useMatchReviews(id);
  const submitReview = useSubmitReview();
  const { data: photos, isPending: photosPending } = useMatchPhotos(id);
  const { data: availability } = useMatchAvailability(id);
  const setAvailability = useSetAvailability();
  const [photosState, setPhotosState] = useState<MatchPhoto[]>([]);
  const [groupConvId, setGroupConvId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    } catch {
      // Supabase not configured
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  useEffect(() => {
    async function loadConv() {
      if (!id || !userId) return;
      try {
        const res = await fetch(`/api/conversations?matchId=${id}`);
        if (res.ok) {
          const convs = await res.json();
          const groupConv = convs.find(
            (c: { type: string; match_id: string }) => c.type === "group" && c.match_id === id,
          );
          if (groupConv) setGroupConvId(groupConv.id);
        }
      } catch { /* ignore */ }
    }
    loadConv();
  }, [id, userId]);

  useEffect(() => { if (photos) setPhotosState(photos); }, [photos]);

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[240px] rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Calendar className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="font-medium text-lg">Match not found</p>
        <p className="text-sm text-muted-foreground mt-1">It may have been deleted.</p>
        <Link href="/dashboard/nearby" className="mt-4">
          <Button variant="outline" size="sm">Browse matches</Button>
        </Link>
      </div>
    );
  }

  const isOrganizer = userId === match.organizer_id;
  const acceptedCount = (match.join_requests ?? []).filter((r: any) => r.status === "ACCEPTED").length;
  const spotsLeft = match.max_players - acceptedCount;
  const acceptedPlayers = (match.join_requests ?? []).filter((r: any) => r.status === "ACCEPTED");
  const pendingPlayers = (match.join_requests ?? []).filter((r: any) => r.status === "PENDING");
  const myRequest = myRequests?.find((r) => r.match_id === id);
  const date = new Date(match.date);
  const dot = statusDot[match.status] ?? "bg-muted-foreground/20";

  function handleDelete() {
    if (!confirm("Permanently delete this match? This cannot be undone.")) return;
    deleteMatch.mutate(id, {
      onSuccess: () => { toast.success("Match deleted"); router.push("/dashboard/my-matches"); },
      onError: (err) => toast.error(err.message),
    });
  }

  function handleArchive() {
    updateMatch.mutate(
      { id, data: { status: "ARCHIVED" } },
      { onSuccess: () => toast.success("Match archived"), onError: (err) => toast.error(err.message) },
    );
  }

  function handleRestore() {
    updateMatch.mutate(
      { id, data: { status: "OPEN" } },
      { onSuccess: () => toast.success("Match restored"), onError: (err) => toast.error(err.message) },
    );
  }

  function handleStatusChange(status: string) {
    updateMatch.mutate(
      { id, data: { status } },
      { onSuccess: () => toast.success("Status updated"), onError: (err) => toast.error(err.message) },
    );
  }

  function handleJoin() {
    joinRequest.mutate(
      { matchId: id },
      { onSuccess: () => toast.success("Join request sent!"), onError: (err) => toast.error(err.message) },
    );
  }

  function handleWithdraw(requestId: string) {
    withdrawRequest.mutate(requestId, {
      onSuccess: () => toast.success("Request withdrawn"),
      onError: (err) => toast.error(err.message),
    });
  }

  function handleRequestAction(requestId: string, action: "ACCEPTED" | "REJECTED") {
    updateJoinRequest(
      { id: requestId, data: { status: action } },
      { onSuccess: () => toast.success(`Request ${action.toLowerCase()}`), onError: (err: Error) => toast.error(err.message) },
    );
  }

  return (
    <div className="min-h-screen pb-24 -mx-4">
      {/* ── Hero ── */}
      <motion.div
        className="relative h-[260px] overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-dark-navy via-dark-navy/95 to-primary/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        {/* Back button */}
        <Link href="/dashboard/my-matches" className="absolute top-4 left-4 z-10 h-9 w-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <ArrowLeft className="h-4.5 w-4.5 text-white" />
        </Link>

        {/* Organizer actions */}
        {isOrganizer && match.status !== "ARCHIVED" && (
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Link href={`/dashboard/matches/${id}/edit`} className="h-9 w-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <Pencil className="h-4 w-4 text-white" />
            </Link>
          </div>
        )}

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
            <span className="text-xs font-medium text-white/70 uppercase tracking-wider">{match.status}</span>
          </div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)] text-white leading-tight">
            {match.title}
          </h1>
          {match.description && (
            <p className="text-sm text-white/60 mt-1 line-clamp-2">{match.description}</p>
          )}
        </div>
      </motion.div>

      {/* ── Stats Bar ── */}
      <motion.div
        className="flex items-center justify-around py-3.5 border-b bg-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="text-sm font-semibold">{date.toLocaleDateString("en", { month: "short", day: "numeric" })}</p>
          </div>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Time</p>
            <p className="text-sm font-semibold">{date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Players</p>
            <p className="text-sm font-semibold">{acceptedCount}/{match.max_players}</p>
          </div>
        </div>
      </motion.div>

      {/* ── Content ── */}
      <div className="px-4 space-y-3 pt-4">
        {/* Location */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          {field ? (
            <div className="flex items-start gap-3 bg-card border rounded-2xl p-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{field.name}</p>
                {field.address && <p className="text-xs text-muted-foreground">{field.address}</p>}
                <p className="text-xs text-muted-foreground">{field.city}</p>
                {field.latitude && field.longitude && (
                  <a href={`https://www.google.com/maps?q=${field.latitude},${field.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary mt-1.5">
                    <ExternalLink className="h-3 w-3" /> Open in Maps
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-card border rounded-2xl p-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <p className="font-medium text-sm">{match.location}</p>
            </div>
          )}
        </motion.div>

        {/* Organizer */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="bg-card border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-2.5">Organized by</p>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={match.profiles?.image ?? undefined} />
                <AvatarFallback>{match.profiles?.name?.[0] ?? "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{match.profiles?.name ?? "Unknown"}</p>
                {match.profiles?.position && <p className="text-xs text-muted-foreground">{match.profiles.position}</p>}
              </div>
              {!isOrganizer && match.organizer_id && (
                <DmButton targetId={match.organizer_id} targetName={match.profiles?.name ?? undefined} size="sm" variant="ghost" />
              )}
            </div>
            <OrganizerContact profiles={match.profiles} viewerId={userId} />
          </div>
        </motion.div>

        {/* Participants */}
        {acceptedPlayers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.25 }}>
            <CollapsibleSection
              title="Players"
              icon={<Users className="h-4 w-4 text-green-500" />}
              count={acceptedCount}
            >
              <div className="flex flex-wrap gap-2">
                {acceptedPlayers.map((r: any) => (
                  <button key={r.player_id} type="button" onClick={() => setSelectedPlayerId(r.player_id)} className="flex items-center gap-2 bg-muted/50 rounded-full pl-1 pr-3 py-1 active:scale-95 transition-transform">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={r.profiles?.image ?? undefined} />
                      <AvatarFallback className="text-[10px]">{r.profiles?.name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{r.profiles?.name ?? "Player"}</span>
                  </button>
                ))}
              </div>
            </CollapsibleSection>
          </motion.div>
        )}

        {/* Join Requests — Organizer only */}
        {isOrganizer && pendingPlayers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
            <CollapsibleSection
              title="Join Requests"
              icon={<Hourglass className="h-4 w-4 text-amber-500" />}
              count={pendingPlayers.length}
              defaultOpen={false}
            >
              <div className="space-y-2">
                {match.join_requests.map((req: any) => {
                  if (req.status !== "PENDING" && req.status !== "ACCEPTED") return null;
                  const ReqIcon = requestStatusConfig[req.status]?.icon ?? Hourglass;
                  const reqStatusLabel = requestStatusConfig[req.status]?.label ?? req.status;
                  return (
                    <div key={req.id} className="flex items-center gap-3 py-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={req.profiles?.image ?? undefined} />
                        <AvatarFallback>{req.profiles?.name?.[0] ?? "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{req.profiles?.name ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{reqStatusLabel}</p>
                      </div>
                      {req.status === "PENDING" && (
                        <div className="flex gap-1.5">
                          <Button size="sm" className="h-8 px-3 text-xs" onClick={() => handleRequestAction(req.id, "ACCEPTED")}>Accept</Button>
                          <Button size="sm" variant="destructive" className="h-8 px-3 text-xs" onClick={() => handleRequestAction(req.id, "REJECTED")}>Reject</Button>
                        </div>
                      )}
                      {req.status === "ACCEPTED" && (
                        <Button size="sm" variant="destructive" className="h-8 px-3 text-xs" disabled={removeAcceptedPlayer.isPending} onClick={() => { if (!confirm(`Remove ${req.profiles?.name}?`)) return; removeAcceptedPlayer.mutate({ id: req.id }); }}>Remove</Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          </motion.div>
        )}

        {/* Team Picker */}
        {isOrganizer && acceptedPlayers.length >= 2 && match.status !== "COMPLETED" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.32 }}>
            <CollapsibleSection title="Teams" icon={<Users className="h-4 w-4 text-primary" />} defaultOpen={false}>
              <TeamPicker players={acceptedPlayers.map((r: any) => ({ id: r.player_id, name: r.profiles?.name ?? null, image: r.profiles?.image ?? null, position: r.profiles?.position ?? null }))} />
            </CollapsibleSection>
          </motion.div>
        )}

        {/* Availability */}
        {match.status !== "COMPLETED" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.34 }}>
            <CollapsibleSection title="Availability" icon={<Clock className="h-4 w-4 text-blue-500" />} defaultOpen={false}>
              <AvailabilityPicker matchId={id} userId={userId} availability={availability ?? []} currentStatus={availability?.find((a) => a.user_id === userId)?.status ?? null} onSet={(status) => setAvailability.mutate({ matchId: id, status })} isPending={setAvailability.isPending} />
            </CollapsibleSection>
          </motion.div>
        )}

        {/* Group Chat */}
        {groupConvId && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.36 }}>
            <Link href={`/dashboard/conversations/${groupConvId}`}>
              <div className="flex items-center gap-3 bg-card border rounded-2xl p-4 active:scale-[0.98] transition-transform">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessagesSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Group Chat</p>
                  <p className="text-xs text-muted-foreground">Talk with all players</p>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Reviews — Completed matches */}
        {match.status === "COMPLETED" && acceptedPlayers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.38 }}>
            <CollapsibleSection title="Rate Players" icon={<Star className="h-4 w-4 text-amber-500" />} defaultOpen={false}>
              <div className="space-y-3">
                {acceptedPlayers.map((req: any, i: number) => {
                  const existingReview = matchReviews?.find((r) => r.reviewer_id === userId && r.player_id === req.player_id);
                  return (
                    <ReviewCard key={req.player_id} player={req.profiles} playerId={req.player_id} matchId={id} existingReview={existingReview} onSubmit={(rating, comment) => { submitReview.mutate({ matchId: id, playerId: req.player_id, rating, comment }, { onSuccess: () => toast.success("Review submitted"), onError: (err) => toast.error(err.message) }); }} isPending={submitReview.isPending} index={i} />
                  );
                })}
              </div>
            </CollapsibleSection>
          </motion.div>
        )}

        {/* Reviews list */}
        {match.status === "COMPLETED" && matchReviews && matchReviews.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.4 }}>
            <CollapsibleSection title="Reviews" icon={<Star className="h-4 w-4 text-amber-500" />} count={matchReviews.length} defaultOpen={false}>
              <div className="space-y-3">
                {matchReviews.map((review) => (
                  <div key={review.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={review.profiles?.image ?? undefined} />
                      <AvatarFallback>{review.profiles?.name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{review.profiles?.name ?? "Unknown"}</p>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, si) => (
                            <Star key={si} className={`h-3 w-3 ${si < review.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`} />
                          ))}
                        </div>
                      </div>
                      {review.comment && <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          </motion.div>
        )}

        {/* Photos */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.42 }}>
          <CollapsibleSection title="Photos" icon={<Camera className="h-4 w-4 text-purple-500" />} count={photosState.length} defaultOpen={false}>
            <PhotoGallery matchId={id} userId={userId} photos={photosState} isParticipant={isOrganizer || acceptedPlayers.some((r: any) => r.player_id === userId)} onUpload={(photo) => setPhotosState((prev) => [photo, ...prev])} onDelete={(photoId) => setPhotosState((prev) => prev.filter((p) => p.id !== photoId))} />
          </CollapsibleSection>
        </motion.div>
      </div>

      {/* ── Sticky Action Bar ── */}
      <div className="fixed bottom-[72px] left-0 right-0 z-40 md:bottom-0">
        <div className="bg-background/80 backdrop-blur-xl border-t border-border/50 px-4 py-3">
          {!isOrganizer && match.status === "OPEN" && (
            <>
              {myRequest?.status === "PENDING" ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Hourglass className="h-4 w-4" />
                    Request pending
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleWithdraw(myRequest.id)} disabled={withdrawRequest.isPending}>Withdraw</Button>
                </div>
              ) : myRequest?.status === "ACCEPTED" ? (
                <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                  <CheckCircle className="h-4 w-4" />
                  You&apos;re in this match
                </div>
              ) : myRequest?.status === "REJECTED" ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Request rejected</span>
                  <Button size="sm" onClick={handleJoin} disabled={joinRequest.isPending}>Request again</Button>
                </div>
              ) : (
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button onClick={handleJoin} disabled={joinRequest.isPending} className="w-full h-12 text-base font-semibold rounded-xl">
                    {joinRequest.isPending ? "Sending..." : "Request to join"}
                  </Button>
                </motion.div>
              )}
            </>
          )}
          {isOrganizer && (
            <div className="flex gap-2">
              {match.status === "OPEN" && (
                <>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleStatusChange("CLOSED")}>Close</Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={handleArchive}>
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </Button>
                </>
              )}
              {match.status === "CLOSED" && (
                <>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleStatusChange("OPEN")}>Reopen</Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={handleArchive}>
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </Button>
                </>
              )}
              {match.status === "FULL" && (
                <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={handleArchive}>
                  <Archive className="h-3.5 w-3.5" />
                  Archive
                </Button>
              )}
              {match.status !== "COMPLETED" && match.status !== "ARCHIVED" && (
                <Button size="sm" className="flex-1" onClick={() => handleStatusChange("COMPLETED")}>Complete</Button>
              )}
              {match.status === "ARCHIVED" && (
                <>
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={handleRestore}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1 gap-1.5" onClick={handleDelete} disabled={deleteMatch.isPending}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Player Profile Modal */}
      {selectedPlayerId && match.join_requests && (
        <PlayerProfileModal
          open={!!selectedPlayerId}
          onOpenChange={(o) => { if (!o) setSelectedPlayerId(null); }}
          player={match.join_requests.find((r: any) => r.player_id === selectedPlayerId)?.profiles as any ?? { id: selectedPlayerId, name: null, image: null, position: null, city: null, bio: null }}
          viewerId={userId}
          onRequestAction={(action) => { const req = match.join_requests.find((r: any) => r.player_id === selectedPlayerId); if (req) { handleRequestAction(req.id, action); setSelectedPlayerId(null); } }}
          actionPending={isUpdatingJoinRequest}
        />
      )}
    </div>
  );
}

function OrganizerContact({ profiles, viewerId }: { profiles: MatchOrganizer | null; viewerId: string | null }) {
  if (!profiles) return null;
  const p = filterPublicProfile(profiles as any, viewerId);
  return <ContactLinks profile={p} />;
}

function ContactLinks({ profile }: { profile: { phone?: string | null; whatsapp?: string | null; facebook?: string | null; instagram?: string | null } }) {
  const items: { href: string; icon: typeof Phone; label: string }[] = [];
  if (profile.phone) items.push({ href: `tel:${profile.phone}`, icon: Phone, label: profile.phone });
  if (profile.whatsapp) items.push({ href: `https://wa.me/${profile.whatsapp.replace(/[^0-9]/g, "")}`, icon: MessageCircle, label: "WhatsApp" });
  if (profile.facebook) items.push({ href: profile.facebook.startsWith("http") ? profile.facebook : `https://facebook.com/${profile.facebook}`, icon: Globe, label: "Facebook" });
  if (profile.instagram) items.push({ href: profile.instagram.startsWith("http") ? profile.instagram : `https://instagram.com/${profile.instagram.replace("@", "")}`, icon: Globe, label: "Instagram" });
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground active:scale-95 transition-transform">
            <Icon className="h-3 w-3" /> {item.label}
          </a>
        );
      })}
    </div>
  );
}

function Camera(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function ReviewCard({ player, playerId, matchId, existingReview, onSubmit, isPending, index }: { player: any; playerId: string; matchId: string; existingReview: any; onSubmit: (rating: number, comment: string) => void; isPending: boolean; index: number; }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);

  if (existingReview) {
    return (
      <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
        <Avatar className="h-9 w-9"><AvatarImage src={player?.image ?? undefined} /><AvatarFallback>{player?.name?.[0] ?? "?"}</AvatarFallback></Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{player?.name ?? "Unknown"}</p>
          <div className="flex gap-0.5 mt-1">{Array.from({ length: 5 }).map((_, si) => <Star key={si} className={`h-3.5 w-3.5 ${si < existingReview.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`} />)}</div>
        </div>
        <Badge variant="secondary" className="text-xs">Done</Badge>
      </div>
    );
  }

  return (
    <div className="border rounded-xl p-3 space-y-2.5">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8"><AvatarImage src={player?.image ?? undefined} /><AvatarFallback>{player?.name?.[0] ?? "?"}</AvatarFallback></Avatar>
        <p className="font-medium text-sm">{player?.name ?? "Unknown"}</p>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, si) => (
          <button key={si} type="button" onMouseEnter={() => setHoveredStar(si + 1)} onMouseLeave={() => setHoveredStar(0)} onClick={() => setRating(si + 1)} className="p-0.5">
            <Star className={`h-5 w-5 transition-colors ${si < (hoveredStar || rating) ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`} />
          </button>
        ))}
        {rating > 0 && <span className="text-sm text-muted-foreground ml-1">{rating}/5</span>}
      </div>
      <textarea className="w-full text-sm border rounded-lg p-2 bg-background resize-none" rows={2} placeholder="Optional comment..." value={comment} onChange={(e) => setComment(e.target.value)} />
      <Button size="sm" disabled={rating === 0 || isPending} onClick={() => onSubmit(rating, comment)} className="gap-1.5">
        <Star className="h-3.5 w-3.5" /> {isPending ? "Submitting..." : "Submit"}
      </Button>
    </div>
  );
}
