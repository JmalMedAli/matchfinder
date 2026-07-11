"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, MapPin, PlusCircle, User, Bell } from "lucide-react";
import { motion } from "framer-motion";

const bottomNavItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/nearby", label: "Nearby", icon: MapPin },
  { href: "/dashboard/matches/new", label: "Create", icon: PlusCircle },
  { href: "/dashboard/my-matches", label: "My Matches", icon: Bell },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

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

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[48px] relative"
            >
              {active && (
                <motion.div
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  layoutId="bottomNavActive"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <motion.div
                className="relative z-10"
                whileTap={isCreate ? { scale: 0.85 } : { scale: 0.9 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground",
                    isCreate && "h-6 w-6",
                  )}
                />
              </motion.div>
              <span
                className={cn(
                  "text-[10px] leading-tight relative z-10 transition-colors",
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
