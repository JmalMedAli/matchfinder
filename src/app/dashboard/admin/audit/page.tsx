"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { History } from "lucide-react";

interface AuditEntry {
  id: string;
  actor_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
  profiles: { name: string | null } | { name: string | null }[] | null;
}

const TARGET_FILTERS = ["all", "profiles", "matches", "football_fields", "reports", "reviews", "match_reviews", "field_reviews", "broadcast_notifications", "app_settings"] as const;

function actorName(profiles: AuditEntry["profiles"]): string {
  const p = Array.isArray(profiles) ? profiles[0] : profiles;
  return p?.name ?? "Unknown";
}

function summarizeChange(entry: AuditEntry): string {
  if (!entry.new_data) return "";
  const old = entry.old_data ?? {};
  const changed = Object.entries(entry.new_data).filter(
    ([key, value]) => key !== "updated_at" && old[key] !== value,
  );
  if (changed.length === 0) return "";
  return changed
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${old[key] ?? "—"} → ${value ?? "—"}`)
    .join(", ");
}

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [targetType, setTargetType] = useState<(typeof TARGET_FILTERS)[number]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 30;

  useEffect(() => {
    function load() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page) });
      if (targetType !== "all") params.set("targetType", targetType);
      fetch(`/api/admin/audit?${params}`)
        .then((r) => {
          if (!r.ok) throw new Error("Failed to load audit log");
          return r.json();
        })
        .then((data) => {
          setEntries(data.entries);
          setTotal(data.total);
        })
        .catch(() => setError("Failed to load audit log."))
        .finally(() => setLoading(false));
    }
    const handle = setTimeout(load, 0);
    return () => clearTimeout(handle);
  }, [page, targetType]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Every staff action against users, matches, fields, reports, reviews, and settings — recorded automatically
          by the database, not by this app. No one, including staff, can edit or delete an entry.
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {TARGET_FILTERS.map((t) => (
          <button
            key={t}
            onClick={() => { setTargetType(t); setPage(1); }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
              targetType === t
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState description={error} onRetry={() => setPage((p) => p)} />
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState icon={History} title="No audit entries" description="No staff actions recorded yet for this filter." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Staff member</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>{actorName(e.profiles)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[11px]">{e.action}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                    {summarizeChange(e) || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{total} entr{total === 1 ? "y" : "ies"}</span>
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
