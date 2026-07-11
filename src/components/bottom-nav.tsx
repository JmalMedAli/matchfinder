"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, MapPin, PlusCircle, User, Bell } from "lucide-react";

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

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[48px]",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-all",
                  active && "scale-110",
                  item.href === "/dashboard/matches/new" &&
                    "h-6 w-6 text-primary bg-primary/10 rounded-full p-1",
                )}
              />
              <span
                className={cn(
                  "text-[10px] leading-tight",
                  active ? "font-semibold" : "font-medium",
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
