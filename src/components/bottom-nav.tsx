"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Plus, User, MessageCircle, Search, List } from "lucide-react";
import { motion } from "framer-motion";
import { useUnreadCounts } from "@/hooks/use-unread-count";

const tabs = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/fields", label: "Fields", icon: Search },
  { href: "/dashboard/matches/new", label: "Create", icon: Plus, isCreate: true },
  { href: "/dashboard/conversations", label: "Chats", icon: MessageCircle },
  { href: "/dashboard/my-matches", label: "Matches", icon: List },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: unreadData } = useUnreadCounts();
  const chatUnread = unreadData?.reduce((sum, c) => sum + Number(c.unread_count), 0) ?? 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Background blur */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/50" />

      <div className="relative flex items-end justify-around h-[72px] px-1 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const isChats = item.href === "/dashboard/conversations";
          const showChatBadge = isChats && chatUnread > 0;

          if (item.isCreate) {
            return (
              <Link key={item.href} href={item.href} className="relative -mt-5">
                <motion.div
                  className="h-14 w-14 rounded-2xl bg-primary shadow-lg shadow-primary/30 flex items-center justify-center"
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                >
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </motion.div>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 py-2 px-3 relative min-w-[56px]"
            >
              {/* Active pill */}
              {active && (
                <motion.div
                  layoutId="bottomNavPill"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 h-1 w-8 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              <motion.div
                className="relative"
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors duration-200",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                />
                {showChatBadge && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {chatUnread > 99 ? "99+" : chatUnread}
                  </span>
                )}
              </motion.div>

              <span
                className={cn(
                  "text-[10px] leading-none transition-colors duration-200",
                  active ? "text-primary font-semibold" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
