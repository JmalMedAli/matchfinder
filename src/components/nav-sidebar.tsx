"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useUiStore } from "@/stores/ui-store";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, PlusCircle, LayoutDashboard, Bell, LogOut, MapPin, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConnectionStatus } from "@/components/connection-status";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/nearby", label: "Nearby Matches", icon: MapPin },
  { href: "/dashboard/matches/new", label: "Create Match", icon: PlusCircle },
  { href: "/dashboard/my-matches", label: "My Matches", icon: LayoutDashboard },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/profile", label: "My Profile", icon: User },
];

function NavContent({
  onNavigate,
  userId: userIdProp,
  onUnreadCountChange,
  unreadVersion,
}: {
  onNavigate?: () => void;
  userId?: string | null;
  onUnreadCountChange?: (count: number) => void;
  unreadVersion?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userImage, setUserImage] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserEmail(data.user.email ?? "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, image")
          .eq("id", data.user.id)
          .single();
        if (profile) {
          setUserName(profile.name ?? data.user.email ?? "User");
          setUserImage(profile.image);
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
      }
    } catch {
      // Supabase not configured
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (unreadVersion && unreadVersion > 0) load();
  }, [unreadVersion, load]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") load();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

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
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map((item, i) => {
        const Icon = item.icon;
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        const showBadge = item.href === "/dashboard/notifications" && unreadCount > 0;
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
                  onClick={onNavigate}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {showBadge && (
                    <motion.span
                      className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </motion.span>
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
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 mt-1"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
        <ConnectionStatus />
      </div>
    </nav>
  );
}

export function NavSidebar({
  userId,
  onUnreadCountChange,
  unreadVersion,
}: {
  userId?: string | null;
  onUnreadCountChange?: (count: number) => void;
  unreadVersion?: number;
}) {
  const { sidebarOpen, setSidebarOpen } = useUiStore();

  return (
    <>
      <aside className="hidden md:flex w-64 border-r bg-background flex-col h-screen sticky top-0">
        <div className="p-4 border-b">
          <Link href="/dashboard" className="text-lg font-bold font-[family-name:var(--font-barlow-condensed)] tracking-wide">
            <span className="text-primary">Match</span>Finder
          </Link>
        </div>
        <NavContent userId={userId} onUnreadCountChange={onUnreadCountChange} unreadVersion={unreadVersion} />
      </aside>

      <div className="md:hidden flex items-center justify-between border-b px-4 h-14 sticky top-0 bg-background z-40">
        <Link href="/dashboard" className="text-lg font-bold font-[family-name:var(--font-barlow-condensed)] tracking-wide">
          <span className="text-primary">Match</span>Finder
        </Link>
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" />}
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <NavContent onNavigate={() => setSidebarOpen(false)} userId={userId} onUnreadCountChange={onUnreadCountChange} unreadVersion={unreadVersion} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
