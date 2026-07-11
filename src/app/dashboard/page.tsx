"use client";

import Link from "next/link";
import { useMatches } from "@/hooks/use-matches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, PlusCircle } from "lucide-react";

export default function DashboardPage() {
  const { data, isPending } = useMatches({ pageSize: 5 });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Find or organize football matches.</p>
        </div>
        <Link href="/dashboard/matches/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create match
          </Button>
        </Link>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upcoming matches</h2>
          <Link href="/dashboard/matches" className="text-sm text-muted-foreground hover:underline">
            View all
          </Link>
        </div>

        {isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : (data?.matches ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No matches yet. Create one to get started!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data?.matches.map((match) => (
              <Link key={match.id} href={`/dashboard/matches/${match.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{match.title}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(match.date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {match.location}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {(match.join_requests ?? []).filter((r) => r.status === "ACCEPTED").length}/{match.max_players}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
