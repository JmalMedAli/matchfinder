"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  MapPin,
  Flag,
  Star,
  Bell,
  BarChart3,
  Settings,
  History,
} from "lucide-react";

const SECTIONS = [
  { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard, adminOnly: false },
  { href: "/dashboard/admin/users", label: "Users", icon: Users, adminOnly: false },
  { href: "/dashboard/admin/matches", label: "Matches", icon: Calendar, adminOnly: false },
  { href: "/dashboard/admin/fields", label: "Fields", icon: MapPin, adminOnly: false },
  { href: "/dashboard/admin/reports", label: "Reports", icon: Flag, adminOnly: false },
  { href: "/dashboard/admin/reviews", label: "Reviews", icon: Star, adminOnly: false },
  { href: "/dashboard/admin/notifications", label: "Notifications", icon: Bell, adminOnly: true },
  { href: "/dashboard/admin/analytics", label: "Analytics", icon: BarChart3, adminOnly: false },
  { href: "/dashboard/admin/audit", label: "Audit Log", icon: History, adminOnly: false },
  { href: "/dashboard/admin/settings", label: "Settings", icon: Settings, adminOnly: true },
];

export function AdminSubnav({ isFullAdmin }: { isFullAdmin: boolean }) {
  const pathname = usePathname();
  const sections = SECTIONS.filter((s) => !s.adminOnly || isFullAdmin);

  return (
    <nav className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
      {sections.map((section) => {
        const active =
          section.href === "/dashboard/admin"
            ? pathname === "/dashboard/admin"
            : pathname.startsWith(section.href);
        const Icon = section.icon;
        return (
          <Link
            key={section.href}
            href={section.href}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
