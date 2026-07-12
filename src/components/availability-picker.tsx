"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, HelpCircle, XCircle, CalendarCheck } from "lucide-react";
import { motion } from "framer-motion";
import type { MatchAvailability } from "@/hooks/use-match-availability";

interface AvailabilityPickerProps {
  matchId: string;
  userId: string | null;
  availability: MatchAvailability[];
  currentStatus: string | null;
  onSet: (status: string) => void;
  isPending: boolean;
}

const statusConfig = {
  available: { label: "Available", icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10 border-green-500/30" },
  maybe: { label: "Maybe", icon: HelpCircle, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30" },
  unavailable: { label: "Can't make it", icon: XCircle, color: "text-red-500", bg: "bg-red-500/10 border-red-500/30" },
};

export function AvailabilityPicker({
  matchId,
  userId,
  availability,
  currentStatus,
  onSet,
  isPending,
}: AvailabilityPickerProps) {
  const counts = {
    available: availability.filter((a) => a.status === "available").length,
    maybe: availability.filter((a) => a.status === "maybe").length,
    unavailable: availability.filter((a) => a.status === "unavailable").length,
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold font-[family-name:var(--font-barlow-condensed)] flex items-center gap-2">
        <CalendarCheck className="h-5 w-5 text-primary" />
        Availability
      </h2>

      <div className="flex gap-2">
        {(Object.entries(statusConfig) as [string, typeof statusConfig.available][]).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = currentStatus === key;
          return (
            <motion.div key={key} whileTap={{ scale: 0.95 }} className="flex-1">
              <Button
                variant={isActive ? "default" : "outline"}
                className={`w-full gap-1.5 h-auto py-2.5 ${isActive ? "" : ""}`}
                onClick={() => onSet(key)}
                disabled={isPending}
              >
                <Icon className={`h-4 w-4 ${isActive ? "" : config.color}`} />
                <span className="text-xs">{config.label}</span>
              </Button>
            </motion.div>
          );
        })}
      </div>

      {(counts.available > 0 || counts.maybe > 0 || counts.unavailable > 0) && (
        <div className="flex gap-3 text-xs text-muted-foreground">
          {counts.available > 0 && (
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              {counts.available} available
            </span>
          )}
          {counts.maybe > 0 && (
            <span className="flex items-center gap-1">
              <HelpCircle className="h-3 w-3 text-amber-500" />
              {counts.maybe} maybe
            </span>
          )}
          {counts.unavailable > 0 && (
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              {counts.unavailable} out
            </span>
          )}
        </div>
      )}

      {availability.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availability.map((a) => {
            const config = statusConfig[a.status as keyof typeof statusConfig] ?? statusConfig.available;
            return (
              <Badge key={a.id} variant="outline" className={`gap-1 text-xs ${config.bg}`}>
                <Avatar className="h-3.5 w-3.5">
                  <AvatarImage src={a.profiles?.image ?? undefined} />
                  <AvatarFallback className="text-[6px]">{a.profiles?.name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                {a.profiles?.name ?? "Unknown"}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
