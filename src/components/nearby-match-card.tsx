"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Users, Navigation } from "lucide-react";
import type { Match } from "@/hooks/use-matches";
import { estimateTravelTime } from "@/lib/geo";
import { motion } from "framer-motion";

interface NearbyMatchCardProps {
  match: Match;
  distanceKm: number;
  index?: number;
}

export function NearbyMatchCard({ match, distanceKm, index = 0 }: NearbyMatchCardProps) {
  const acceptedCount = (match.join_requests ?? []).filter(
    (r) => r.status === "ACCEPTED",
  ).length;
  const spotsLeft = match.max_players - acceptedCount;
  const date = new Date(match.date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4 }}
    >
      <Card className="hover:shadow-lg hover:border-primary/20 transition-all duration-300 h-full">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base line-clamp-1">{match.title}</h3>
            <Badge variant={match.status === "OPEN" ? "default" : "secondary"}>
              {match.status}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {date.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}{" "}
              {date.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {match.football_fields?.city ?? match.location}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {spotsLeft > 0 ? `${spotsLeft} spots left` : "Full"}
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 font-medium">
              <Navigation className="h-3 w-3" />
              {distanceKm < 1
                ? `${Math.round(distanceKm * 1000)} m`
                : `${distanceKm.toFixed(1)} km`}
            </span>
            <span className="text-muted-foreground">
              ~{estimateTravelTime(distanceKm)} by car
            </span>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Link href={`/dashboard/matches/${match.id}`} className="w-full">
            <Button variant="outline" className="w-full" size="sm">
              View details
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
