"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Match } from "@/hooks/use-matches";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  OPEN: "default",
  FULL: "secondary",
  CLOSED: "destructive",
  COMPLETED: "outline",
};

export function MatchCard({ match }: { match: Match }) {
  const acceptedCount = (match.join_requests ?? []).filter((r) => r.status === "ACCEPTED").length;
  const date = new Date(match.date);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-1">{match.title}</CardTitle>
          <Badge variant={statusVariant[match.status] ?? "outline"}>{match.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-muted-foreground">{match.location}</p>
        <p className="text-xs text-muted-foreground">
          by {match.profiles?.name ?? "Unknown"}
          {match.profiles?.position && (
            <span className="ml-1 text-muted-foreground/70">· {match.profiles.position}</span>
          )}
        </p>
        <p className="text-xs">
          {acceptedCount}/{match.max_players} players
        </p>
      </CardContent>
      <CardFooter>
        <Link href={`/dashboard/matches/${match.id}`} className="w-full">
          <Button variant="outline" className="w-full">
            View details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
