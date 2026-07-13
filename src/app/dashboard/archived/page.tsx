"use client";

import { useMatches, useUpdateMatch, useDeleteMatch } from "@/hooks/use-matches";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive, RotateCcw, Trash2, Calendar, MapPin,
  ChevronRight, ArrowLeft, ArchiveRestore
} from "lucide-react";
import { motion } from "framer-motion";

export default function ArchivedMatchesPage() {
  const router = useRouter();
  const { data, isPending } = useMatches({ status: "ARCHIVED", pageSize: 50 });
  const updateMatch = useUpdateMatch();
  const deleteMatch = useDeleteMatch();

  function handleRestore(matchId: string) {
    updateMatch.mutate(
      { id: matchId, data: { status: "OPEN" } },
      { onSuccess: () => { toast.success("Match restored"); router.refresh(); } },
    );
  }

  function handleDelete(matchId: string) {
    if (!confirm("Permanently delete this match? This cannot be undone.")) return;
    deleteMatch.mutate(matchId, {
      onSuccess: () => { toast.success("Match deleted"); },
    });
  }

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/my-matches"
          className="h-9 w-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
            <Archive className="h-4 w-4 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)]">
            Archived Matches
          </h1>
        </div>
      </div>

      {/* ── Loading ── */}
      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : data?.matches.length === 0 ? (
        /* ── Empty State ── */
        <div className="flex flex-col items-center py-20 text-center">
          <motion.div
            className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Archive className="h-8 w-8 text-muted-foreground/40" />
          </motion.div>
          <p className="font-medium text-muted-foreground">No archived matches</p>
          <p className="text-sm text-muted-foreground/60 mt-0.5">
            Matches you archive will appear here.
          </p>
          <Link href="/dashboard/my-matches" className="mt-4">
            <Button variant="outline" size="sm">Back to My Matches</Button>
          </Link>
        </div>
      ) : (
        /* ── Archived List ── */
        <div className="space-y-2">
          {data?.matches.map((match, i) => {
            const date = new Date(match.date);
            return (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
              >
                <div className="bg-card border rounded-2xl overflow-hidden">
                  {/* Match Info */}
                  <Link
                    href={`/dashboard/matches/${match.id}`}
                    className="flex items-center gap-3.5 p-3.5 active:bg-muted/30 transition-colors"
                  >
                    <div className="h-12 w-12 rounded-xl bg-muted flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase leading-tight">
                        {date.toLocaleDateString("en", { month: "short" })}
                      </span>
                      <span className="text-base font-bold text-muted-foreground leading-tight">
                        {date.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{match.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{match.location}</span>
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px] h-5">
                      Archived
                    </Badge>
                  </Link>

                  {/* Actions */}
                  <div className="flex border-t divide-x">
                    <button
                      type="button"
                      onClick={() => handleRestore(match.id)}
                      disabled={updateMatch.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-primary active:bg-primary/5 transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(match.id)}
                      disabled={deleteMatch.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-destructive active:bg-destructive/5 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete permanently
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
