"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { CalendarMatch } from "@/hooks/use-calendar-matches";
import {
  X, Calendar, Clock, MapPin, Users, ChevronRight, DollarSign, Zap
} from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-green-500",
  FULL: "bg-amber-500",
  CLOSED: "bg-muted-foreground/40",
  COMPLETED: "bg-muted-foreground/20",
};

const RELATION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  organizer: { label: "Organizing", color: "text-amber-600", bg: "bg-amber-500/10" },
  joined: { label: "Playing", color: "text-primary", bg: "bg-primary/10" },
  pending: { label: "Pending", color: "text-orange-600", bg: "bg-orange-500/10" },
  rejected: { label: "Rejected", color: "text-destructive", bg: "bg-destructive/10" },
  available: { label: "Available", color: "text-muted-foreground", bg: "bg-muted" },
};

interface DayDetailSheetProps {
  date: string;
  day: number;
  month: number;
  year: number;
  matches: CalendarMatch[];
  isPending: boolean;
  userId: string | null;
  onClose: () => void;
}

export function DayDetailSheet({
  date,
  day,
  month,
  year,
  matches,
  isPending,
  userId,
  onClose,
}: DayDetailSheetProps) {
  const router = useRouter();
  const dateObj = new Date(year, month, day);
  const dayName = dateObj.toLocaleDateString("en", { weekday: "long" });

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-40 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl max-h-[80vh] flex flex-col"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{dayName}</p>
            <h3 className="text-lg font-bold font-[family-name:var(--font-barlow-condensed)]">
              {MONTH_NAMES[month]} {day}, {year}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {matches.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {matches.length} match{matches.length !== 1 ? "es" : ""}
              </Badge>
            )}
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {isPending ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Calendar className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-sm mb-1">No matches</p>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                No football matches scheduled for this day
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-full text-xs"
                onClick={() => { onClose(); router.push("/dashboard/matches/new"); }}
              >
                Create a match
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((match, i) => {
                const matchDate = new Date(match.date);
                const spotsLeft = match.max_players - match.accepted_count;
                const relation = RELATION_CONFIG[match.user_relation] ?? RELATION_CONFIG.available;
                const org = match.profiles;
                const field = match.football_fields;

                return (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.05 }}
                  >
                    <button
                      onClick={() => { onClose(); router.push(`/dashboard/matches/${match.id}`); }}
                      className="w-full text-left bg-card border rounded-2xl p-4 active:scale-[0.98] transition-transform"
                    >
                      <div className="flex items-start gap-3">
                        {/* Time block */}
                        <div className="h-14 w-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-lg font-bold text-primary leading-none">
                            {matchDate.getHours().toString().padStart(2, "0")}
                          </span>
                          <span className="text-[9px] font-medium text-primary/60">
                            :{matchDate.getMinutes().toString().padStart(2, "0")}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_COLORS[match.status] ?? "bg-muted-foreground/20"}`} />
                            <p className="font-semibold text-sm truncate">{match.title}</p>
                          </div>

                          {/* Organizer */}
                          {org && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={org.image ?? undefined} />
                                <AvatarFallback className="text-[7px]">{org.name?.[0] ?? "?"}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground truncate">{org.name ?? "Organizer"}</span>
                            </div>
                          )}

                          {/* Info row */}
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                            {field && (
                              <span className="flex items-center gap-0.5 truncate">
                                <Zap className="h-3 w-3 shrink-0 text-primary/60" />
                                {field.name}
                              </span>
                            )}
                            {match.price_per_person != null && match.price_per_person > 0 && (
                              <span className="flex items-center gap-0.5 text-amber-600">
                                <DollarSign className="h-3 w-3" />
                                {match.price_per_person}
                              </span>
                            )}
                          </div>

                          {/* Bottom row */}
                          <div className="flex items-center justify-between mt-2">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1.5 py-0 h-4 ${relation.bg} ${relation.color} border-0`}
                            >
                              {relation.label}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-muted-foreground/50" />
                              <span className={`text-xs font-medium ${spotsLeft === 0 ? "text-muted-foreground" : "text-primary"}`}>
                                {match.accepted_count}/{match.max_players}
                              </span>
                            </div>
                          </div>
                        </div>

                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-1" />
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
