"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Match } from "@/hooks/use-matches";
import { Calendar, MapPin, Users, User } from "lucide-react";
import { motion } from "framer-motion";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  OPEN: { label: "Open", variant: "default" },
  FULL: { label: "Full", variant: "secondary" },
  CLOSED: { label: "Closed", variant: "destructive" },
  COMPLETED: { label: "Completed", variant: "outline" },
};

export function MatchCard({ match, index = 0 }: { match: Match; index?: number }) {
  const acceptedCount = (match.join_requests ?? []).filter((r) => r.status === "ACCEPTED").length;
  const spotsLeft = match.max_players - acceptedCount;
  const date = new Date(match.date);
  const status = statusConfig[match.status] ?? { label: match.status, variant: "outline" as const };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4 }}
    >
      <Card className="hover:shadow-lg hover:border-primary/20 transition-all duration-300 h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg font-[family-name:var(--font-barlow-condensed)] line-clamp-1">
              {match.title}
            </CardTitle>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary/70" />
              {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary/70" />
              {match.location}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-4 w-4 text-primary/70" />
              {match.profiles?.name ?? "Unknown"}
              {match.profiles?.position && (
                <span className="text-muted-foreground/60">· {match.profiles.position}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="h-4 w-4 text-primary/70" />
              <span className={spotsLeft === 0 ? "text-muted-foreground" : "text-primary font-medium"}>
                {acceptedCount}/{match.max_players}
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Link href={`/dashboard/matches/${match.id}`} className="w-full">
            <Button variant="outline" className="w-full gap-2">
              View details
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
