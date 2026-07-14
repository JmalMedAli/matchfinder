"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Users, Navigation, ChevronRight, DollarSign } from "lucide-react";
import type { Match } from "@/hooks/use-matches";
import { estimateTravelTime } from "@/lib/geo";
import { MatchCountdown } from "@/components/match-countdown";
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={`/dashboard/matches/${match.id}`} className="block active:scale-[0.98] transition-transform">
        <div className="flex items-center gap-3.5 p-3.5 bg-card border rounded-2xl hover:shadow-md hover:border-primary/20 transition-all">
          {/* Date pill */}
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
            <span className="text-[10px] font-semibold text-primary uppercase leading-tight">
              {date.toLocaleDateString("en", { month: "short" })}
            </span>
            <span className="text-lg font-bold text-primary leading-tight">
              {date.getDate()}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-sm truncate">{match.title}</h3>
              <Badge variant={spotsLeft > 0 ? "default" : "secondary"} className="shrink-0 text-[10px] h-5">
                {spotsLeft > 0 ? `${spotsLeft} spots` : "Full"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {match.football_fields?.city ?? match.location}
              </span>
            </div>
            {match.position_needed && (
              <span className="inline-flex items-center text-[11px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5 mt-1 w-fit">
                {match.position_needed} needed
              </span>
            )}
            {match.price_per_person != null && match.price_per_person > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 rounded-full px-2 py-0.5 mt-1 w-fit">
                <DollarSign className="h-2.5 w-2.5" />
                {match.price_per_person} TND
              </span>
            )}
            {match.status === "OPEN" && (
              <div className="mt-1">
                <MatchCountdown date={match.date} />
              </div>
            )}
            {distanceKm > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
                  <Navigation className="h-2.5 w-2.5" />
                  {distanceKm < 1
                    ? `${Math.round(distanceKm * 1000)} m`
                    : `${distanceKm.toFixed(1)} km`}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  ~{estimateTravelTime(distanceKm)}
                </span>
              </div>
            )}
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
        </div>
      </Link>
    </motion.div>
  );
}
