"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMatch, useDeleteMatch, useUpdateMatch } from "@/hooks/use-matches";
import { useJoinRequest, useJoinRequests, useUpdateJoinRequest, useWithdrawJoinRequest } from "@/hooks/use-join-requests";
import { useRealtimeJoinRequests } from "@/hooks/use-realtime-join-requests";
import { useFootballField } from "@/hooks/use-football-fields";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ExternalLink, Phone, MessageCircle, Globe } from "lucide-react";
import { filterPublicProfile } from "@/types/profile";
import type { MatchOrganizer } from "@/hooks/use-matches";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  OPEN: "default",
  FULL: "secondary",
  CLOSED: "destructive",
  COMPLETED: "outline",
};

const requestStatusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  ACCEPTED: "default",
  REJECTED: "destructive",
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
  const { mutate: updateJoinRequest } = useUpdateJoinRequest();

  useRealtimeJoinRequests({ matchId: id });
  const { data: field } = useFootballField(match?.football_field_id);

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

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!match) {
    return <p className="text-muted-foreground">Match not found.</p>;
  }

  const isOrganizer = userId === match.organizer_id;
  const acceptedCount = (match.join_requests ?? []).filter((r: any) => r.status === "ACCEPTED").length;
  const myRequest = myRequests?.find((r) => r.match_id === id);
  const date = new Date(match.date);

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{match.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={statusVariant[match.status]}>{match.status}</Badge>
            <span className="text-sm text-muted-foreground">
              {acceptedCount}/{match.max_players} players
            </span>
          </div>
        </div>
        {isOrganizer && (
          <div className="flex gap-2">
            <Link href={`/dashboard/matches/${id}/edit`}>
              <Button variant="outline" size="sm">Edit</Button>
            </Link>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteMatch.isPending}>
              Delete
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="space-y-3 py-4 text-sm">
          <div>
            <p className="text-muted-foreground">Date & time</p>
            <p>{date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          {field ? (
            <div>
              <p className="text-muted-foreground mb-2">Location</p>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{field.name}</p>
                    {field.address && (
                      <p className="text-xs text-muted-foreground">{field.address}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{field.city}</p>
                  </div>
                </div>
                {field.latitude && field.longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${field.latitude},${field.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in Google Maps
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-muted-foreground">Location</p>
              <p>{match.location}</p>
            </div>
          )}
          {match.description && (
            <div>
              <p className="text-muted-foreground">Description</p>
              <p>{match.description}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Organized by</p>
            <p>{match.profiles?.name ?? "Unknown"}</p>
            {match.profiles?.position && (
              <p className="text-xs text-muted-foreground">{match.profiles.position}</p>
            )}
          </div>
          <OrganizerContact profiles={match.profiles} viewerId={userId} />
        </CardContent>
      </Card>

      {!isOrganizer && match.status === "OPEN" && (
        <div>
          {myRequest?.status === "PENDING" ? (
            <div className="flex items-center gap-3">
              <Badge variant="secondary">Request pending</Badge>
              <Button variant="outline" size="sm" onClick={() => handleWithdraw(myRequest.id)} disabled={withdrawRequest.isPending}>
                Withdraw
              </Button>
            </div>
          ) : myRequest?.status === "ACCEPTED" ? (
            <Badge>You are accepted</Badge>
          ) : myRequest?.status === "REJECTED" ? (
            <div className="flex items-center gap-3">
              <Badge variant="destructive">Request rejected</Badge>
              <Button size="sm" onClick={handleJoin} disabled={joinRequest.isPending}>
                {joinRequest.isPending ? "Requesting..." : "Request again"}
              </Button>
            </div>
          ) : (
            <Button onClick={handleJoin} disabled={joinRequest.isPending}>
              {joinRequest.isPending ? "Sending..." : "Request to join"}
            </Button>
          )}
        </div>
      )}

      {isOrganizer && (
        <div className="flex gap-2 flex-wrap">
          {match.status === "OPEN" && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange("CLOSED")}>Close registration</Button>
          )}
          {match.status === "CLOSED" && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange("OPEN")}>Reopen</Button>
          )}
          {match.status !== "COMPLETED" && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange("COMPLETED")}>Mark completed</Button>
          )}
        </div>
      )}

      {isOrganizer && (match.join_requests?.length ?? 0) > 0 && (
        <>
          <Separator />
          <h2 className="text-lg font-semibold">Join Requests</h2>
          <div className="space-y-3">
            {match.join_requests.map((req: any) => (
              <Card key={req.id}>
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={req.profiles?.image ?? undefined} />
                        <AvatarFallback>{req.profiles?.name?.[0] ?? "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{req.profiles?.name ?? "Unknown"}</p>
                        {req.profiles?.position && (
                          <p className="text-xs text-muted-foreground">{req.profiles.position}</p>
                        )}
                        <Badge variant={requestStatusVariant[req.status]} className="text-xs">
                          {req.status}
                        </Badge>
                      </div>
                    </div>
                    {req.status === "PENDING" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleRequestAction(req.id, "ACCEPTED")}>Accept</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleRequestAction(req.id, "REJECTED")}>Reject</Button>
                      </div>
                    )}
                  </div>
                  <RequestContact profiles={req.profiles} viewerId={userId} />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
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
    <div className="flex flex-wrap gap-2 pt-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            <Icon className="h-3 w-3" />
            {item.label}
          </a>
        );
      })}
    </div>
  );
}
