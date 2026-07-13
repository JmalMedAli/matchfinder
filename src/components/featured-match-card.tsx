"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, MapPin, Star } from "lucide-react";
import { motion } from "framer-motion";

interface FeaturedMatchCardProps {
  match: {
    id: string;
    title: string;
    date: string;
    max_players: number;
    location: string;
    status: string;
    position_needed: string | null;
    profiles: { name: string | null } | null;
    join_requests: Array<{ status: string }>;
    football_fields: { name: string; city: string } | null;
  };
}

export function FeaturedMatchCard({ match }: FeaturedMatchCardProps) {
  const date = new Date(match.date);
  const acceptedCount = match.join_requests.filter((r) => r.status === "ACCEPTED").length;

  return (
    <Link href={`/dashboard/matches/${match.id}`}>
      <motion.div
        whileHover={{ y: -2 }}
        className="relative bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 cursor-pointer"
      >
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
            <Star className="h-3 w-3 fill-amber-500" /> Featured
          </Badge>
        </div>

        <h3 className="font-semibold text-sm pr-16">{match.title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">by {match.profiles?.name ?? "Unknown"}</p>

        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {date.toLocaleDateString("en", { month: "short", day: "numeric" })} at {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {match.football_fields?.city ?? match.location}
          </span>
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {acceptedCount}/{match.max_players}
          </span>
          {match.position_needed && (
            <Badge variant="outline" className="text-[10px] h-5">{match.position_needed} needed</Badge>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
