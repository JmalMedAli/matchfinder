"use client";

import Link from "next/link";
import { useMatches } from "@/hooks/use-matches";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, PlusCircle, Users, ArrowRight, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { data, isPending } = useMatches({ pageSize: 5 });

  return (
    <div className="space-y-8">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">
            Dashboard
          </h1>
          <p className="text-muted-foreground">Find or organize football matches.</p>
        </div>
        <Link href="/dashboard/matches/new">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Create match
          </Button>
        </Link>
      </motion.div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold font-[family-name:var(--font-barlow-condensed)] flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Upcoming matches
          </h2>
          <Link href="/dashboard/matches" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (data?.matches ?? []).length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <motion.div
                className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Calendar className="h-7 w-7 text-muted-foreground" />
              </motion.div>
              <p className="text-muted-foreground font-medium mb-1">No matches yet</p>
              <p className="text-sm text-muted-foreground/70 mb-4">Create your first match to get started</p>
              <Link href="/dashboard/matches/new">
                <Button size="sm" className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Create match
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data?.matches.map((match, i) => {
              const acceptedCount = (match.join_requests ?? []).filter(
                (r) => r.status === "ACCEPTED",
              ).length;
              const spotsLeft = match.max_players - acceptedCount;
              const date = new Date(match.date);

              return (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Link href={`/dashboard/matches/${match.id}`}>
                    <Card className="hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-14 w-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-lg font-bold text-primary leading-none">
                            {date.getDate()}
                          </span>
                          <span className="text-[10px] font-medium text-primary/70 uppercase">
                            {date.toLocaleString("default", { month: "short" })}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{match.title}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{match.location}</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className={spotsLeft === 0 ? "text-muted-foreground" : "text-primary font-medium"}>
                              {acceptedCount}/{match.max_players}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {spotsLeft === 0 ? "Full" : `${spotsLeft} spot${spotsLeft > 1 ? "s" : ""} left`}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
