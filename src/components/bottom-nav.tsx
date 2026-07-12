"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, MapPin, PlusCircle, User, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useUnreadCounts } from "@/hooks/use-unread-count";

const bottomNavItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/nearby", label: "Nearby", icon: MapPin },
  { href: "/dashboard/matches/new", label: "Create", icon: PlusCircle },
  { href: "/dashboard/conversations", label: "Chats", icon: MessageCircle },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: unreadData } = useUnreadCounts();
  const chatUnread = unreadData?.reduce((sum, c) => sum + Number(c.unread_count), 0) ?? 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const isCreate = item.href === "/dashboard/matches/new";
          const isChats = item.href === "/dashboard/conversations";
          const showChatBadge = isChats && chatUnread > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[48px] relative transition-all duration-200",
              )}
            >
              <div
                className={cn(
                  "absolute inset-0 rounded-xl transition-all duration-200",
                  active ? "bg-primary/10" : "bg-transparent",
                )}
              />
              <motion.div
                className="relative z-10"
                whileTap={isCreate ? { scale: 0.85 } : { scale: 0.9 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors duration-200",
                    active
                      ? "text-primary"
                      : "text-muted-foreground",
                    isCreate && "h-6 w-6",
                  )}
                />
                {showChatBadge && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {chatUnread > 99 ? "99+" : chatUnread}
                  </span>
                )}
              </motion.div>
              <span
                className={cn(
                  "text-[10px] leading-tight relative z-10 transition-colors duration-200",
                  active ? "text-primary font-semibold" : "text-muted-foreground font-medium",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
