"use client";

import { useJoinRequests, useWithdrawJoinRequest } from "@/hooks/use-join-requests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const requestStatusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  ACCEPTED: "default",
  REJECTED: "destructive",
};

export default function MyMatchesPage() {
  const { data: requests, isPending } = useJoinRequests();
  const withdrawRequest = useWithdrawJoinRequest();

  if (isPending) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  const accepted = requests?.filter((r) => r.status === "ACCEPTED") ?? [];
  const pending = requests?.filter((r) => r.status === "PENDING") ?? [];
  const rejected = requests?.filter((r) => r.status === "REJECTED") ?? [];

  function renderList(items: typeof requests, showWithdraw = false) {
    if (!items?.length) {
      return <p className="text-sm text-muted-foreground">None</p>;
    }
    return (
      <div className="space-y-2">
        {items.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <Link href={`/dashboard/matches/${r.match_id}`} className="font-medium hover:underline">
                  {r.matches?.title ?? "Match"}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {r.matches?.location} &middot; {r.matches ? new Date(r.matches.date).toLocaleDateString() : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={requestStatusVariant[r.status]}>{r.status}</Badge>
                {showWithdraw && r.status === "PENDING" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={withdrawRequest.isPending}
                    onClick={() => {
                      withdrawRequest.mutate(r.id, {
                        onSuccess: () => toast.success("Request withdrawn"),
                        onError: (err) => toast.error(err.message),
                      });
                    }}
                  >
                    Withdraw
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Matches</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Accepted</h2>
        {renderList(accepted)}
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pending</h2>
        {renderList(pending, true)}
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Rejected</h2>
        {renderList(rejected)}
      </section>
    </div>
  );
}
