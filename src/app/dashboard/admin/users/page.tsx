"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { MoreHorizontal, Search, Users, Shield, ShieldOff, Ban } from "lucide-react";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  city: string | null;
  role: string;
  status: string;
  matches_played: number;
  avg_rating: number;
  created_at: string;
}

const STATUS_FILTERS = ["all", "active", "suspended", "banned"] as const;

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "banned") return "destructive";
  if (status === "suspended") return "secondary";
  return "default";
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullAdmin, setIsFullAdmin] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setIsFullAdmin(!!data?.isFullAdmin))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page) });
      if (searchInput) params.set("q", searchInput);
      if (statusFilter !== "all") params.set("status", statusFilter);
      fetch(`/api/admin/users?${params}`)
        .then((r) => {
          if (!r.ok) throw new Error("Failed to load users");
          return r.json();
        })
        .then((data) => {
          setUsers(data.users);
          setTotal(data.total);
        })
        .catch(() => setError("Failed to load users."))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [page, searchInput, statusFilter]);

  async function updateUser(id: string, body: Record<string, string>) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Action failed");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...body } : u)));
    toast.success("Updated");
  }

  async function deleteUser(id: string) {
    if (!confirm("Ban and remove this user's public profile info? This cannot be easily undone.")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Delete failed");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: "banned", name: "Deleted User" } : u)));
    toast.success("User removed");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">Users</h1>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or email…"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={() => setPage((p) => p)} />
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description="Try a different search or filter." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Matches</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Link href={`/dashboard/admin/users/${u.id}`} className="flex items-center gap-2 hover:underline">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={u.image ?? undefined} />
                        <AvatarFallback className="text-xs">{(u.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium leading-tight">{u.name ?? "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground leading-tight">{u.email}</p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.city ?? "—"}</TableCell>
                  <TableCell>
                    {u.role === "admin" ? (
                      <Badge>Admin</Badge>
                    ) : u.role === "moderator" ? (
                      <Badge variant="secondary">Moderator</Badge>
                    ) : (
                      <span className="text-muted-foreground">Player</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(u.status)} className="capitalize">{u.status}</Badge>
                  </TableCell>
                  <TableCell>{u.matches_played}</TableCell>
                  <TableCell>{u.avg_rating > 0 ? u.avg_rating.toFixed(1) : "—"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem render={<Link href={`/dashboard/admin/users/${u.id}`} />}>
                          View profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {u.status !== "suspended" && (
                          <DropdownMenuItem onClick={() => updateUser(u.id, { status: "suspended" })}>
                            <ShieldOff className="h-4 w-4" /> Suspend
                          </DropdownMenuItem>
                        )}
                        {u.status !== "active" && (
                          <DropdownMenuItem onClick={() => updateUser(u.id, { status: "active" })}>
                            <Shield className="h-4 w-4" /> Reactivate
                          </DropdownMenuItem>
                        )}
                        {u.status !== "banned" && (
                          <DropdownMenuItem variant="destructive" onClick={() => updateUser(u.id, { status: "banned" })}>
                            <Ban className="h-4 w-4" /> Ban
                          </DropdownMenuItem>
                        )}
                        {isFullAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            {u.role === "admin" ? (
                              <DropdownMenuItem onClick={() => updateUser(u.id, { role: "user" })}>
                                Remove admin role
                              </DropdownMenuItem>
                            ) : u.role === "moderator" ? (
                              <DropdownMenuItem onClick={() => updateUser(u.id, { role: "user" })}>
                                Remove moderator role
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => updateUser(u.id, { role: "moderator" })}>
                                  Make moderator
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateUser(u.id, { role: "admin" })}>
                                  Make admin
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => deleteUser(u.id)}>
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{total} user{total === 1 ? "" : "s"}</span>
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
