"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ChevronRight, List, Shield, Bell, Star, Settings,
  HelpCircle, LogOut, Pencil, MapPin, Calendar
} from "lucide-react";

const menuSections = [
  {
    title: "Matches",
    items: [
      { href: "/dashboard/my-matches", label: "My Matches", icon: List, description: "Matches you joined" },
      { href: "/dashboard/my-matches", label: "Organizing", icon: Shield, description: "Matches you created" },
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell, description: "Alerts and updates" },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/dashboard/profile/edit", label: "Edit Profile", icon: Pencil, description: "Name, photo, bio" },
      { href: "/dashboard/admin", label: "Admin Panel", icon: Shield, description: "Manage the platform" },
    ],
  },
  {
    title: "Support",
    items: [
      { href: "#", label: "Help & Support", icon: HelpCircle, description: "Get assistance" },
    ],
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const { data: profile, isPending } = useProfile();

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

        {/* ── Sign Out ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
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
