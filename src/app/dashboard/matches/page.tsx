"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMatches } from "@/hooks/use-matches";
import { MatchCard } from "@/components/match-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

const statuses = ["", "OPEN", "FULL", "CLOSED", "COMPLETED"];

export default function MatchesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const status = searchParams.get("status") ?? "";
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const { data, isPending, error, refetch } = useMatches({ status: status || undefined, search: search || undefined, page });

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

  const [searchInput, setSearchInput] = useState(search);
  const [syncedSearch, setSyncedSearch] = useState(search);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  if (search !== syncedSearch) {
    setSyncedSearch(search);
    setSearchInput(search);
  }

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => updateParam("search", value), 350);
  }, [updateParam]);

  useEffect(() => {
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, []);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">
          All Matches
        </h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search matches..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statuses.map((s) => (
            <Button
              key={s}
              variant={status === s ? "default" : "outline"}
              size="sm"
              onClick={() => updateParam("status", s)}
              className={status === s ? "" : "text-muted-foreground"}
            >
              {s || "All"}
            </Button>
          ))}
        </div>
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState description="Failed to load matches." onRetry={() => refetch()} />
      ) : !data?.matches.length ? (
        <EmptyState
          icon={Search}
          title="No matches found"
          description={search || status ? "Try adjusting your search or filters." : "No matches yet — be the first to create one."}
          action={{ label: "Create a match", href: "/dashboard/matches/new" }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.matches.map((m, i) => (
            <MatchCard key={m.id} match={m} index={i} />
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => updateParam("page", String(page - 1))}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => updateParam("page", String(page + 1))}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}
