"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMatches } from "@/hooks/use-matches";
import { MatchCard } from "@/components/match-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallback, useTransition } from "react";

const statuses = ["", "OPEN", "FULL", "CLOSED", "COMPLETED"];

export default function MatchesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const status = searchParams.get("status") ?? "";
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const { data, isPending } = useMatches({ status: status || undefined, search: search || undefined, page });

  const updateParam = useCallback((key: string, value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      if (key !== "page") params.delete("page");
      router.replace(`/dashboard/matches?${params.toString()}`, { scroll: false });
    });
  }, [searchParams, router, startTransition]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Matches</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search matches..."
          value={search}
          onChange={(e) => updateParam("search", e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex gap-2 flex-wrap">
          {statuses.map((s) => (
            <Button
              key={s}
              variant={status === s ? "default" : "outline"}
              size="sm"
              onClick={() => updateParam("status", s)}
            >
              {s || "All"}
            </Button>
          ))}
        </div>
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : !data?.matches.length ? (
        <p className="text-muted-foreground text-center py-12">No matches found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => updateParam("page", String(page - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground py-1">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => updateParam("page", String(page + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
