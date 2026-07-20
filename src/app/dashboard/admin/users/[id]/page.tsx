"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { ArrowLeft, Star, Trophy, Target, Flag } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  city: string | null;
  position: string | null;
  role: string;
  status: string;
  matches_played: number;
  goals_scored: number;
  motm_awards: number;
  avg_rating: number;
  created_at: string;
}

interface UserDetail {
  profile: Profile;
  recentMatches: { id: string; title: string; date: string; status: string }[];
  joinRequestCount: number;
  reportsFiled: number;
  reportsAgainst: number;
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function fetchDetail() {
    return fetch(`/api/admin/users/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load user");
        return r.json();
      })
      .then(setDetail)
      .catch(() => setError("Failed to load user."))
      .finally(() => setLoading(false));
  }

  function reload() {
    setLoading(true);
    setError(null);
    fetchDetail();
  }

  useEffect(() => { fetchDetail(); }, [id]);

  async function updateStatus(status: string) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Action failed");
      return;
    }
    toast.success("Updated");
    reload();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (error || !detail) {
    return <ErrorState description={error ?? "User not found."} onRetry={reload} />;
  }

  const { profile } = detail;

  return (
    <div className="space-y-4">
      <Link href="/dashboard/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to users
      </Link>

      <Card>
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.image ?? undefined} />
            <AvatarFallback>{(profile.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{profile.name ?? "Unnamed"}</h1>
              {profile.role === "admin" && <Badge>Admin</Badge>}
              {profile.role === "moderator" && <Badge variant="secondary">Moderator</Badge>}
              <Badge variant={profile.status === "banned" ? "destructive" : profile.status === "suspended" ? "secondary" : "default"} className="capitalize">
                {profile.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {profile.city ?? "No city"} · {profile.position ?? "No position"} · joined {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            {profile.status !== "suspended" && (
              <Button variant="outline" size="sm" onClick={() => updateStatus("suspended")}>Suspend</Button>
            )}
            {profile.status !== "active" && (
              <Button variant="outline" size="sm" onClick={() => updateStatus("active")}>Reactivate</Button>
            )}
            {profile.status !== "banned" && (
              <Button variant="destructive" size="sm" onClick={() => updateStatus("banned")}>Ban</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Matches played", value: profile.matches_played, icon: Trophy },
          { label: "Goals scored", value: profile.goals_scored, icon: Target },
          { label: "Avg rating", value: profile.avg_rating > 0 ? profile.avg_rating.toFixed(1) : "—", icon: Star },
          { label: "Reports against", value: detail.reportsAgainst, icon: Flag },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-3 flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-lg font-bold leading-tight">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="font-semibold text-sm mb-3">Recently organized matches</p>
          {detail.recentMatches.length === 0 ? (
            <p className="text-xs text-muted-foreground">No matches organized.</p>
          ) : (
            <div className="space-y-2">
              {detail.recentMatches.map((m) => (
                <Link
                  key={m.id}
                  href={`/dashboard/matches/${m.id}`}
                  className="flex items-center justify-between text-sm hover:underline"
                >
                  <span>{m.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(m.date).toLocaleDateString()} · {m.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
