"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Bell, LogOut, MapPin, User, MessageCircle, Shield, LayoutDashboard, PlusCircle, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConnectionStatus } from "@/components/connection-status";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";

const desktopNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/fields", label: "Football Fields", icon: Search },
  { href: "/dashboard/nearby", label: "Nearby Matches", icon: MapPin },
  { href: "/dashboard/matches/new", label: "Create Match", icon: PlusCircle },
  { href: "/dashboard/conversations", label: "Conversations", icon: MessageCircle },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/profile", label: "My Profile", icon: User },
];

const adminNavItem = { href: "/dashboard/admin", label: "Admin", icon: Shield };

function useNavData(onUnreadCountChange?: (count: number) => void) {
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userImage, setUserImage] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserEmail(data.user.email ?? "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, image, role")
          .eq("id", data.user.id)
          .single();
        if (profile) {
          setUserName(profile.name ?? data.user.email ?? "User");
          setUserImage(profile.image);
          setIsAdmin(profile.role === "admin" || profile.role === "moderator");
        } else {
          setUserName(data.user.email ?? "User");
        }
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", data.user.id)
          .eq("read", false);
        const c = count ?? 0;
        setUnreadCount(c);
        onUnreadCountChange?.(c);

        const { data: chatCounts } = await supabase.rpc("get_unread_counts", {
          uid: data.user.id,
        });
        const totalChatUnread = (chatCounts as { unread_count: number }[] | null)
          ?.reduce((sum, row) => sum + Number(row.unread_count), 0) ?? 0;
        setChatUnreadCount(totalChatUnread);
      }
    } catch {
      // Supabase not configured
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    const handle = setTimeout(load, 0);
    return () => clearTimeout(handle);
  }, [load]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") load();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  return { userName, userEmail, userImage, unreadCount, chatUnreadCount, isAdmin, reload: load };
}

/* ═══════════════════════════════════════════
   MOBILE HEADER — Clean, native-style
   ═══════════════════════════════════════════ */

export function MobileHeader({
  userId,
  onUnreadCountChange,
  unreadVersion,
}: {
  userId?: string | null;
  onUnreadCountChange?: (count: number) => void;
  unreadVersion?: number;
}) {
  const { unreadCount, reload } = useNavData(onUnreadCountChange);

  useEffect(() => {
    if (unreadVersion && unreadVersion > 0) reload();
  }, [unreadVersion, reload]);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-background/80 backdrop-blur-xl border-b border-border/50 md:hidden">
      <Link href="/dashboard" className="flex items-center gap-2">
        <span className="text-lg font-bold font-[family-name:var(--font-barlow-condensed)]">
          <span className="text-primary">Match</span>Finder
        </span>
      </Link>

      <Link href="/dashboard/notifications" className="relative p-2 -mr-2">
        <Bell className="h-5 w-5 text-foreground" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="absolute top-1 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
      </Link>
    </header>
  );
}

/* ═══════════════════════════════════════════
   DESKTOP SIDEBAR — Unchanged
   ═══════════════════════════════════════════ */

export function NavSidebar({
  userId,
  onUnreadCountChange,
  unreadVersion,
}: {
  userId?: string | null;
  onUnreadCountChange?: (count: number) => void;
  unreadVersion?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { userName, userEmail, userImage, unreadCount, chatUnreadCount, isAdmin } = useNavData(onUnreadCountChange);
  const navItems = isAdmin ? [...desktopNavItems, adminNavItem] : desktopNavItems;

  useEffect(() => {
    if (unreadVersion && unreadVersion > 0) {
      // reload handled by useNavData
    }
  }, [unreadVersion]);

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
    <aside className="hidden md:flex w-64 border-r bg-background flex-col h-screen sticky top-0">
      <div className="p-4 border-b">
        <Link href="/dashboard" className="text-lg font-bold font-[family-name:var(--font-barlow-condensed)] tracking-wide">
          <span className="text-primary">Match</span>Finder
        </Link>
      </div>
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item, i) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const showBadge =
            (item.href === "/dashboard/notifications" && unreadCount > 0) ||
            (item.href === "/dashboard/conversations" && chatUnreadCount > 0);
          const badgeCount =
            item.href === "/dashboard/conversations" ? chatUnreadCount : unreadCount;
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Link href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Button
                    variant={active ? "secondary" : "ghost"}
                    className={cn("w-full justify-start gap-2", active && "font-medium")}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {showBadge && (
                      <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          );
        })}
        <div className="mt-auto pt-4 border-t">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={userImage ?? undefined} />
              <AvatarFallback>{userName ? userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : <span className="h-3 w-3 animate-pulse rounded-full bg-muted-foreground/30" />}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              {userName ? (
                <p className="text-sm font-medium truncate">{userName}</p>
              ) : (
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              )}
              {userEmail ? (
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              ) : (
                <div className="h-3 w-32 animate-pulse rounded bg-muted mt-1" />
              )}
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2 mt-1" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
          <ConnectionStatus />
        </div>
      </nav>
    </aside>
  );
}
