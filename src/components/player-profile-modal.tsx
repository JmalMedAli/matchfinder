"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { DmButton } from "@/components/dm-button";
import {
  MapPin, Calendar, Trophy, Users, Phone, MessageCircle,
  Globe, CheckCircle, XCircle, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { filterPublicProfile } from "@/types/profile";
import type { MatchOrganizer } from "@/hooks/use-matches";

interface PlayerStats {
  matchesPlayed: number;
  matchesOrganized: number;
  memberSince: string | null;
}

interface PlayerProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: MatchOrganizer & { id: string };
  onRequestAction?: (action: "ACCEPTED" | "REJECTED") => void;
  actionPending?: boolean;
  viewerId: string | null;
}

export function PlayerProfileModal({
  open,
  onOpenChange,
  player,
  onRequestAction,
  actionPending = false,
  viewerId,
}: PlayerProfileModalProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (!open || !player.id) return;
    setStatsLoading(true);
    fetch(`/api/players/${player.id}/stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [open, player.id]);

  const profile = filterPublicProfile(player as any, viewerId);
  const memberSince = stats?.memberSince
    ? new Date(stats.memberSince).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{player.name ?? "Player Profile"}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <div className="bg-gradient-to-br from-[#0F172A] via-[#1a2744] to-[#16A34A]/30 px-6 pt-8 pb-6">
            <div className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <Avatar className="h-24 w-24 border-4 border-white/20 shadow-xl">
                  <AvatarImage src={player.image ?? undefined} />
                  <AvatarFallback className="text-2xl bg-white/10 text-white">
                    {player.name?.[0] ?? "?"}
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="mt-4"
              >
                <h2 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)] text-white">
                  {player.name ?? "Unknown Player"}
                </h2>
                {player.position && (
                  <Badge className="mt-2 bg-white/15 text-white border-white/20 hover:bg-white/20">
                    {player.position}
                  </Badge>
                )}
                {player.city && (
                  <p className="flex items-center justify-center gap-1 mt-2 text-sm text-white/60">
                    <MapPin className="h-3.5 w-3.5" />
                    {player.city}
                  </p>
                )}
              </motion.div>
            </div>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="px-6 py-5 space-y-5"
          >
            {statsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : stats && (
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  icon={<Trophy className="h-4 w-4 text-primary" />}
                  value={stats.matchesPlayed}
                  label="Matches"
                />
                <StatCard
                  icon={<Users className="h-4 w-4 text-primary" />}
                  value={stats.matchesOrganized}
                  label="Organized"
                />
                <StatCard
                  icon={<Calendar className="h-4 w-4 text-primary" />}
                  value={memberSince ?? "—"}
                  label="Member"
                  isText
                />
              </div>
            )}

            {player.bio && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">About</p>
                <p className="text-sm leading-relaxed">{player.bio}</p>
              </div>
            )}

            <ContactLinks profile={profile} />

            <Separator />

            <div className="flex items-center gap-2">
              <DmButton
                targetId={player.id}
                targetName={player.name ?? undefined}
                size="sm"
                variant="outline"
              />
            </div>
          </motion.div>

          {onRequestAction && (
            <div className="flex gap-2 px-6 pb-5">
              <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
                <Button
                  variant="destructive"
                  className="w-full gap-1.5"
                  onClick={() => onRequestAction("REJECTED")}
                  disabled={actionPending}
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
                <Button
                  className="w-full gap-1.5 bg-[#16A34A] hover:bg-[#15803D]"
                  onClick={() => onRequestAction("ACCEPTED")}
                  disabled={actionPending}
                >
                  <CheckCircle className="h-4 w-4" />
                  Accept
                </Button>
              </motion.div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  icon,
  value,
  label,
  isText = false,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  isText?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border bg-muted/30 p-3">
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
        {icon}
      </div>
      <span className={`font-bold ${isText ? "text-xs" : "text-lg"} font-[family-name:var(--font-barlow-condensed)]`}>
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  );
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
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</p>
      <div className="flex flex-wrap gap-2">
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
    </div>
  );
}
