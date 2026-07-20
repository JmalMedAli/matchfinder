"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import {
  ChevronRight, List, Shield, Bell, Star, Settings,
  HelpCircle, LogOut, Pencil, MapPin, Calendar, Archive, Moon, Sun, Users,
  Trophy, Target, TrendingUp
} from "lucide-react";
import { PlayerSearch } from "@/components/player-search";
import { PlayerAchievements } from "@/components/player-achievements";
import { NotificationPreferences } from "@/components/notification-preferences";

function getMenuSections(isAdmin: boolean) {
  return [
    {
      title: "Matches",
      items: [
        { href: "/dashboard/my-matches", label: "My Matches", icon: List, description: "Matches you joined" },
        { href: "/dashboard/my-matches", label: "Organizing", icon: Shield, description: "Matches you created" },
        { href: "/dashboard/archived", label: "Archived Matches", icon: Archive, description: "Hidden matches" },
        { href: "/dashboard/notifications", label: "Notifications", icon: Bell, description: "Alerts and updates" },
      ],
    },
    {
      title: "Account",
      items: [
        { href: "/dashboard/profile/edit", label: "Edit Profile", icon: Pencil, description: "Name, photo, bio" },
        ...(isAdmin ? [{ href: "/dashboard/admin", label: "Admin Panel", icon: Shield, description: "Manage the platform" }] : []),
      ],
    },
    {
      title: "Support",
      items: [
        { href: "#", label: "Help & Support", icon: HelpCircle, description: "Get assistance" },
      ],
    },
  ];
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: profile, isPending } = useProfile();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const menuSections = getMenuSections(profile?.role === "admin");

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Supabase not configured
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen pb-24">
      {/* ── Profile Header ── */}
      <motion.div
        className="relative rounded-2xl overflow-hidden mb-6"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />

        <div className="relative p-6 pt-8 flex flex-col items-center text-center">
          {isPending ? (
            <div className="h-20 w-20 rounded-full bg-muted animate-pulse" />
          ) : (
            <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
              <AvatarImage src={profile?.image ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                {profile?.name?.[0] ?? "?"}
              </AvatarFallback>
            </Avatar>
          )}

          <div className="mt-3">
            {isPending ? (
              <div className="h-6 w-32 bg-muted animate-pulse rounded mx-auto" />
            ) : (
              <h1 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)]">
                {profile?.name ?? "Player"}
              </h1>
            )}
            {profile?.position && (
              <p className="text-sm text-muted-foreground mt-0.5">{profile.position}</p>
            )}
            {profile?.city && (
              <p className="text-xs text-muted-foreground/70 flex items-center justify-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {profile.city}
              </p>
            )}
          </div>

          <Link href="/dashboard/profile/edit" className="mt-4">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full">
              <Pencil className="h-3.5 w-3.5" />
              Edit profile
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* ── Player Stats ── */}
      {profile?.id && (profile.matches_played ?? 0) > 0 && (
        <motion.div
          className="mb-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
            Statistics
          </p>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-card border rounded-xl p-3 text-center">
              <TrendingUp className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold font-[family-name:var(--font-barlow-condensed)]">{profile.matches_played ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Matches</p>
            </div>
            <div className="bg-card border rounded-xl p-3 text-center">
              <Target className="h-4 w-4 text-green-500 mx-auto mb-1" />
              <p className="text-lg font-bold font-[family-name:var(--font-barlow-condensed)]">{profile.goals_scored ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Goals</p>
            </div>
            <div className="bg-card border rounded-xl p-3 text-center">
              <Trophy className="h-4 w-4 text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-bold font-[family-name:var(--font-barlow-condensed)]">{profile.motm_awards ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">MOTM</p>
            </div>
            <div className="bg-card border rounded-xl p-3 text-center">
              <Star className="h-4 w-4 text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-bold font-[family-name:var(--font-barlow-condensed)]">{(profile.avg_rating ?? 0).toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground">Rating</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Achievements ── */}
      {profile?.id && (
        <motion.div
          className="mb-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
        >
          <PlayerAchievements playerId={profile.id} />
        </motion.div>
      )}

      {/* ── Menu Sections ── */}
      <div className="space-y-5">
        {menuSections.map((section, si) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + si * 0.05 }}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
              {section.title}
            </p>
            <div className="bg-card border rounded-2xl overflow-hidden divide-y divide-border/50">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.label} href={item.href}>
                    <div className="flex items-center gap-3.5 px-4 py-3.5 active:bg-muted/50 transition-colors">
                      <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Icon className="h-4.5 w-4.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        ))}

        {/* ── Appearance ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
            Appearance
          </p>
          <div className="bg-card border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3.5 px-4 py-3.5">
              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Moon className="h-4.5 w-4.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Switch theme</p>
              </div>
              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${theme === "dark" ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 ease-in-out flex items-center justify-center ${theme === "dark" ? "translate-x-5" : "translate-x-0"}`}>
                    {theme === "dark" ? <Moon className="h-3 w-3 text-primary" /> : <Sun className="h-3 w-3 text-muted-foreground" />}
                  </span>
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Player Search ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
            Find Players
          </p>
          <PlayerSearch />
        </motion.div>

        {/* ── Notification Preferences ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <NotificationPreferences userId={profile?.id ?? ""} />
        </motion.div>

        {/* ── Sign Out ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Button
            variant="ghost"
            className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 py-6 rounded-2xl"
            onClick={handleSignOut}
          >
            <LogOut className="h-4.5 w-4.5" />
            Sign out
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
