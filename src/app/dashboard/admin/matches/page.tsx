"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Search, Calendar, Pencil, XCircle, CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AdminMatch {
  id: string;
  title: string;
  date: string;
  status: string;
  max_players: number;
  organizer_id: string;
  football_field_id: string | null;
  profiles: { name: string | null } | null;
  football_fields: { name: string; city: string } | null;
}

const STATUS_FILTERS = ["all", "OPEN", "FULL", "CLOSED", "COMPLETED", "ARCHIVED"] as const;

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "COMPLETED") return "secondary";
  if (status === "ARCHIVED") return "outline";
  return "default";
}

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 20;

  function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page) });
    if (searchInput) params.set("q", searchInput);
    if (statusFilter !== "all") params.set("status", statusFilter);
    fetch(`/api/admin/matches?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load matches");
        return r.json();
      })
      .then((data) => {
        setMatches(data.matches);
        setTotal(data.total);
      })
      .catch(() => setError("Failed to load matches."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const handle = setTimeout(load, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchInput, statusFilter]);

  async function patchMatch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/matches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Action failed");
      return false;
    }
    toast.success("Updated");
    load();
    return true;
  }

  async function deleteMatch(id: string) {
    if (!confirm("Permanently delete this match? This removes its join requests, chat, and reviews.")) return;
    const res = await fetch(`/api/admin/matches/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Delete failed");
      return;
    }
    toast.success("Match deleted");
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">Matches</h1>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title…"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : matches.length === 0 ? (
        <EmptyState icon={Calendar} title="No matches found" description="Try a different search or filter." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Match</TableHead>
                <TableHead>Organizer</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link href={`/dashboard/matches/${m.id}`} className="font-medium hover:underline">
                      {m.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.profiles?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.football_fields ? `${m.football_fields.name} (${m.football_fields.city})` : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(m.date).toLocaleDateString()}</TableCell>
                  <TableCell><Badge variant={statusVariant(m.status)}>{m.status}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem render={<Link href={`/dashboard/admin/matches/${m.id}/edit`} />}>
                          <Pencil className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        {(m.status === "CLOSED" || m.status === "COMPLETED" || m.status === "ARCHIVED") && (
                          <DropdownMenuItem onClick={() => patchMatch(m.id, { action: "reopen" })}>
                            <RotateCcw className="h-4 w-4" /> Reopen
                          </DropdownMenuItem>
                        )}
                        {m.status !== "COMPLETED" && (
                          <DropdownMenuItem onClick={() => patchMatch(m.id, { action: "force-complete" })}>
                            <CheckCircle2 className="h-4 w-4" /> Force complete
                          </DropdownMenuItem>
                        )}
                        {m.status !== "ARCHIVED" && (
                          <DropdownMenuItem onClick={() => patchMatch(m.id, { action: "cancel" })}>
                            <XCircle className="h-4 w-4" /> Cancel
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => deleteMatch(m.id)}>
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{total} match{total === 1 ? "" : "es"}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
