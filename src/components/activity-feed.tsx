"use client";

import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, UserPlus, Star, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

interface ActivityItem {
  id: string;
  action: string;
  created_at: string;
  profiles: { name: string | null; image: string | null } | null;
  matches: { title: string; date: string } | null;
}

const actionIcons: Record<string, typeof Clock> = {
  joined: UserPlus,
  reviewed: Star,
  completed: CheckCircle,
};

async function fetchActivity(): Promise<ActivityItem[]> {
  const res = await fetch("/api/activity");
  if (!res.ok) throw new Error("Failed to fetch activity");
  return res.json();
}

export function ActivityFeed() {
  const { data: items, isPending } = useQuery({
    queryKey: ["activity"],
    queryFn: fetchActivity,
    staleTime: 30_000,
  });

  if (isPending) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-2xl bg-muted animate-pulse" />)}</div>;

  if (!items?.length) return <p className="text-center text-sm text-muted-foreground py-8">No recent activity</p>;

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => {
        const Icon = actionIcons[item.action] ?? Clock;
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-card border"
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={item.profiles?.image ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{item.profiles?.name?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">
                <span className="font-medium">{item.profiles?.name ?? "Someone"}</span>
                {" "} {item.action}{" "}
                {item.matches && <span className="font-medium">{item.matches.title}</span>}
              </p>
              <p className="text-xs text-muted-foreground">{timeAgo(item.created_at)}</p>
            </div>
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          </motion.div>
        );
      })}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
