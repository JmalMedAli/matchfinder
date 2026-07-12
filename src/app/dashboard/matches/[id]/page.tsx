"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMatch, useDeleteMatch, useUpdateMatch } from "@/hooks/use-matches";
import { useJoinRequest, useJoinRequests, useUpdateJoinRequest, useWithdrawJoinRequest } from "@/hooks/use-join-requests";
import { useRealtimeJoinRequests } from "@/hooks/use-realtime-join-requests";
import { useMatchReviews, useSubmitReview } from "@/hooks/use-reviews";
import { useMatchPhotos } from "@/hooks/use-match-photos";
import type { MatchPhoto } from "@/hooks/use-match-photos";
import { PhotoGallery } from "@/components/photo-gallery";
import { useFootballField } from "@/hooks/use-football-fields";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { DmButton } from "@/components/dm-button";
import { PlayerProfileModal } from "@/components/player-profile-modal";
import {
  MapPin, ExternalLink, Phone, MessageCircle, Globe,
  Calendar, Clock, Users, ArrowLeft, Pencil, Trash2,
  CheckCircle, XCircle, Hourglass, MessagesSquare, Eye, Star
} from "lucide-react";
import { filterPublicProfile } from "@/types/profile";
import type { MatchOrganizer } from "@/hooks/use-matches";
import { motion } from "framer-motion";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  OPEN: { label: "Open", variant: "default" },
  FULL: { label: "Full", variant: "secondary" },
  CLOSED: { label: "Closed", variant: "destructive" },
  COMPLETED: { label: "Completed", variant: "outline" },
};

const requestStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
  PENDING: { label: "Pending", variant: "secondary", icon: Hourglass },
  ACCEPTED: { label: "Accepted", variant: "default", icon: CheckCircle },
  REJECTED: { label: "Rejected", variant: "destructive", icon: XCircle },
};

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

  useRealtimeJoinRequests({ matchId: id });
  const { data: field } = useFootballField(match?.football_field_id);
  const { data: matchReviews } = useMatchReviews(id);
  const submitReview = useSubmitReview();
  const { data: photos, isPending: photosPending } = useMatchPhotos(id);
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

  useEffect(() => {
    loadUser();
  }, [loadUser]);

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
      } catch {
        // ignore
      }
    }
    loadConv();
  }, [id, userId]);

  useEffect(() => {
    if (photos) setPhotosState(photos);
  }, [photos]);

  if (isPending) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Calendar className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="font-medium text-lg">This match is no longer available.</p>
        <p className="text-sm text-muted-foreground mt-1">It may have been deleted or completed.</p>
        <Link href="/dashboard/nearby" className="mt-4">
          <Button variant="outline" size="sm">Browse nearby matches</Button>
        </Link>
      </div>
    );
  }

  const isOrganizer = userId === match.organizer_id;
  const acceptedCount = (match.join_requests ?? []).filter((r: any) => r.status === "ACCEPTED").length;
  const spotsLeft = match.max_players - acceptedCount;
  const acceptedPlayers = (match.join_requests ?? []).filter((r: any) => r.status === "ACCEPTED");
  const myRequest = myRequests?.find((r) => r.match_id === id);
  const date = new Date(match.date);
  const status = statusConfig[match.status] ?? { label: match.status, variant: "outline" as const };

  function handleDelete() {
    if (!confirm("Delete this match?")) return;
    deleteMatch.mutate(id, {
      onSuccess: () => {
        toast.success("Match deleted");
        router.push("/dashboard/matches");
      },
      onError: (err) => toast.error(err.message),
    });
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
      {
        onSuccess: () => toast.success("Join request sent!"),
        onError: (err) => toast.error(err.message),
      },
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
      {
        onSuccess: () => toast.success(`Request ${action.toLowerCase()}`),
        onError: (err: Error) => toast.error(err.message),
      },
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link href="/dashboard/matches" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to matches
        </Link>
      </motion.div>

      <motion.div
        className="relative rounded-2xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
      >
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

        <div className="relative z-10 p-6 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-[family-name:var(--font-barlow-condensed)] text-white">
                {match.title}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={status.variant}>{status.label}</Badge>
                <span className="text-sm text-white/70 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {acceptedCount}/{match.max_players} players
                  {spotsLeft > 0 && match.status === "OPEN" && (
                    <span className="text-primary font-medium"> · {spotsLeft} spot{spotsLeft > 1 ? "s" : ""} left</span>
                  )}
                </span>
              </div>
            </div>
            {isOrganizer && (
              <div className="flex gap-2">
                <Link href={`/dashboard/matches/${id}/edit`}>
                  <Button variant="outline" size="sm" className="gap-1.5 bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm">
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </Link>
                <Button variant="destructive" size="sm" className="gap-1.5" onClick={handleDelete} disabled={deleteMatch.isPending}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">{date.toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="font-medium">{date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
            </div>

            {field ? (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{field.name}</p>
                    {field.address && (
                      <p className="text-sm text-muted-foreground">{field.address}</p>
                    )}
                    <p className="text-sm text-muted-foreground">{field.city}</p>
                  </div>
                </div>
                {field.latitude && field.longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${field.latitude},${field.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in Google Maps
                  </a>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium">{match.location}</p>
                </div>
              </div>
            )}

            {match.description && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{match.description}</p>
              </div>
            )}

            <Separator />

            <div>
              <p className="text-xs text-muted-foreground mb-2">Organized by</p>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={match.profiles?.image ?? undefined} />
                  <AvatarFallback>{match.profiles?.name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{match.profiles?.name ?? "Unknown"}</p>
                  {match.profiles?.position && (
                    <p className="text-xs text-muted-foreground">{match.profiles.position}</p>
                  )}
                </div>
              </div>
              <OrganizerContact profiles={match.profiles} viewerId={userId} />
              {!isOrganizer && match.organizer_id && (
                <div className="mt-3">
                  <DmButton
                    targetId={match.organizer_id}
                    targetName={match.profiles?.name ?? undefined}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {!isOrganizer && match.status === "OPEN" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          {myRequest?.status === "PENDING" ? (
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="gap-1.5">
                <Hourglass className="h-3 w-3" />
                Request pending
              </Badge>
              <motion.div whileTap={{ scale: 0.9 }}>
                <Button variant="outline" size="sm" onClick={() => handleWithdraw(myRequest.id)} disabled={withdrawRequest.isPending}>
                  Withdraw
                </Button>
              </motion.div>
            </div>
          ) : myRequest?.status === "ACCEPTED" ? (
            <Badge className="gap-1.5">
              <CheckCircle className="h-3 w-3" />
              You are accepted
            </Badge>
          ) : myRequest?.status === "REJECTED" ? (
            <div className="flex items-center gap-3">
              <Badge variant="destructive" className="gap-1.5">
                <XCircle className="h-3 w-3" />
                Request rejected
              </Badge>
              <Button size="sm" onClick={handleJoin} disabled={joinRequest.isPending}>
                {joinRequest.isPending ? "Requesting..." : "Request again"}
              </Button>
            </div>
          ) : (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={handleJoin} disabled={joinRequest.isPending} className="gap-2">
                {joinRequest.isPending ? "Sending..." : "Request to join"}
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}

      {isOrganizer && (
        <motion.div
          className="flex gap-2 flex-wrap"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          {match.status === "OPEN" && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange("CLOSED")}>Close registration</Button>
          )}
          {match.status === "CLOSED" && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange("OPEN")}>Reopen</Button>
          )}
          {match.status !== "COMPLETED" && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange("COMPLETED")}>Mark completed</Button>
          )}
        </motion.div>
      )}

      {groupConvId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.18 }}
        >
          <Link href={`/dashboard/conversations/${groupConvId}`}>
            <Button variant="outline" className="gap-2">
              <MessagesSquare className="h-4 w-4" />
              Group Chat
            </Button>
          </Link>
        </motion.div>
      )}

      {isOrganizer && (match.join_requests?.length ?? 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Separator className="mb-6" />
          <h2 className="text-lg font-semibold font-[family-name:var(--font-barlow-condensed)] mb-4">
            Join Requests
          </h2>
          <div className="space-y-3">
            {match.join_requests.map((req: any, i: number) => {
              const reqStatus = requestStatusConfig[req.status] ?? { label: req.status, variant: "outline" as const, icon: Hourglass };
              const ReqIcon = reqStatus.icon;
              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={req.profiles?.image ?? undefined} />
                            <AvatarFallback>{req.profiles?.name?.[0] ?? "?"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{req.profiles?.name ?? "Unknown"}</p>
                            {req.profiles?.position && (
                              <p className="text-xs text-muted-foreground">{req.profiles.position}</p>
                            )}
                            <Badge variant={reqStatus.variant} className="text-xs mt-1 gap-1">
                              <ReqIcon className="h-3 w-3" />
                              {reqStatus.label}
                            </Badge>
                          </div>
                        </div>
                        {req.status === "PENDING" && (
                          <div className="flex gap-2">
                            <motion.div whileTap={{ scale: 0.9 }}>
                              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSelectedPlayerId(req.player_id)}>
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </Button>
                            </motion.div>
                            <motion.div whileTap={{ scale: 0.9 }}>
                              <Button size="sm" onClick={() => handleRequestAction(req.id, "ACCEPTED")}>Accept</Button>
                            </motion.div>
                            <motion.div whileTap={{ scale: 0.9 }}>
                              <Button size="sm" variant="destructive" onClick={() => handleRequestAction(req.id, "REJECTED")}>Reject</Button>
                            </motion.div>
                          </div>
                        )}
                      </div>
                      <RequestContact profiles={req.profiles} viewerId={userId} />
                      {isOrganizer && req.player_id !== userId && (
                        <div className="mt-2">
                          <DmButton
                            targetId={req.player_id}
                            targetName={req.profiles?.name ?? undefined}
                            size="sm"
                            variant="ghost"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {match.status === "COMPLETED" && acceptedPlayers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <Separator className="mb-6" />
          <h2 className="text-lg font-semibold font-[family-name:var(--font-barlow-condensed)] mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Rate Players
          </h2>
          <div className="space-y-3">
            {acceptedPlayers.map((req: any, i: number) => {
              const existingReview = matchReviews?.find(
                (r) => r.reviewer_id === userId && r.player_id === req.player_id,
              );
              return (
                <ReviewCard
                  key={req.player_id}
                  player={req.profiles}
                  playerId={req.player_id}
                  matchId={id}
                  existingReview={existingReview}
                  onSubmit={(rating, comment) => {
                    submitReview.mutate(
                      { matchId: id, playerId: req.player_id, rating, comment },
                      { onSuccess: () => toast.success("Review submitted"), onError: (err) => toast.error(err.message) },
                    );
                  }}
                  isPending={submitReview.isPending}
                  index={i}
                />
              );
            })}
          </div>
        </motion.div>
      )}

      {match.status === "COMPLETED" && matchReviews && matchReviews.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Separator className="mb-6" />
          <h2 className="text-lg font-semibold font-[family-name:var(--font-barlow-condensed)] mb-4">
            Reviews
          </h2>
          <div className="space-y-3">
            {matchReviews.map((review, i) => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={review.profiles?.image ?? undefined} />
                      <AvatarFallback>{review.profiles?.name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{review.profiles?.name ?? "Unknown"}</p>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, si) => (
                            <Star
                              key={si}
                              className={`h-3 w-3 ${si < review.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        <Separator className="mb-6" />
        <PhotoGallery
          matchId={id}
          userId={userId}
          photos={photosState}
          isParticipant={isOrganizer || acceptedPlayers.some((r: any) => r.player_id === userId)}
          onUpload={(photo) => setPhotosState((prev) => [photo, ...prev])}
          onDelete={(photoId) => setPhotosState((prev) => prev.filter((p) => p.id !== photoId))}
        />
      </motion.div>

      {selectedPlayerId && match.join_requests && (
        <PlayerProfileModal
          open={!!selectedPlayerId}
          onOpenChange={(o) => { if (!o) setSelectedPlayerId(null); }}
          player={match.join_requests.find((r: any) => r.player_id === selectedPlayerId)?.profiles as any ?? { id: selectedPlayerId, name: null, image: null, position: null, city: null, bio: null }}
          viewerId={userId}
          onRequestAction={(action) => {
            const req = match.join_requests.find((r: any) => r.player_id === selectedPlayerId);
            if (req) {
              handleRequestAction(req.id, action);
              setSelectedPlayerId(null);
            }
          }}
          actionPending={isUpdatingJoinRequest}
        />
      )}
    </div>
  );
}

function OrganizerContact({
  profiles,
  viewerId,
}: {
  profiles: MatchOrganizer | null;
  viewerId: string | null;
}) {
  if (!profiles) return null;
  const p = filterPublicProfile(profiles as any, viewerId);
  return <ContactLinks profile={p} />;
}

function RequestContact({
  profiles,
  viewerId,
}: {
  profiles: MatchOrganizer | undefined;
  viewerId: string | null;
}) {
  if (!profiles) return null;
  const p = filterPublicProfile(profiles as any, viewerId);
  return <ContactLinks profile={p} />;
}

function ContactLinks({
  profile,
}: {
  profile: { phone?: string | null; whatsapp?: string | null; facebook?: string | null; instagram?: string | null };
}) {
  const items: { href: string; icon: typeof Phone; label: string }[] = [];
  if (profile.phone) items.push({ href: `tel:${profile.phone}`, icon: Phone, label: profile.phone });
  if (profile.whatsapp) items.push({ href: `https://wa.me/${profile.whatsapp.replace(/[^0-9]/g, "")}`, icon: MessageCircle, label: "WhatsApp" });
  if (profile.facebook) items.push({ href: profile.facebook.startsWith("http") ? profile.facebook : `https://facebook.com/${profile.facebook}`, icon: Globe, label: "Facebook" });
  if (profile.instagram) items.push({ href: profile.instagram.startsWith("http") ? profile.instagram : `https://instagram.com/${profile.instagram.replace("@", "")}`, icon: Globe, label: "Instagram" });

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Icon className="h-3 w-3" />
            {item.label}
          </a>
        );
      })}
    </div>
  );
}

function ReviewCard({
  player,
  playerId,
  matchId,
  existingReview,
  onSubmit,
  isPending,
  index,
}: {
  player: any;
  playerId: string;
  matchId: string;
  existingReview: any;
  onSubmit: (rating: number, comment: string) => void;
  isPending: boolean;
  index: number;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);

  if (existingReview) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={player?.image ?? undefined} />
              <AvatarFallback>{player?.name?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{player?.name ?? "Unknown"}</p>
              <div className="flex gap-0.5 mt-1">
                {Array.from({ length: 5 }).map((_, si) => (
                  <Star
                    key={si}
                    className={`h-3.5 w-3.5 ${si < existingReview.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">Reviewed</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={player?.image ?? undefined} />
            <AvatarFallback>{player?.name?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{player?.name ?? "Unknown"}</p>
            {player?.position && (
              <p className="text-xs text-muted-foreground">{player.position}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, si) => (
            <button
              key={si}
              type="button"
              onMouseEnter={() => setHoveredStar(si + 1)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => setRating(si + 1)}
              className="p-0.5"
            >
              <Star
                className={`h-5 w-5 transition-colors ${
                  si < (hoveredStar || rating)
                    ? "fill-amber-500 text-amber-500"
                    : "text-muted-foreground/30 hover:text-muted-foreground/50"
                }`}
              />
            </button>
          ))}
          {rating > 0 && <span className="text-sm text-muted-foreground ml-1">{rating}/5</span>}
        </div>
        <textarea
          className="w-full text-sm border rounded-lg p-2 bg-background resize-none"
          rows={2}
          placeholder="Optional comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <Button
          size="sm"
          disabled={rating === 0 || isPending}
          onClick={() => onSubmit(rating, comment)}
          className="gap-1.5"
        >
          <Star className="h-3.5 w-3.5" />
          {isPending ? "Submitting..." : "Submit Review"}
        </Button>
      </CardContent>
    </Card>
  );
}
