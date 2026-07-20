"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AdminReview {
  id: string;
  type: "reviews" | "match_reviews" | "field_reviews";
  rating: number | null;
  comment: string | null;
  created_at: string;
  reviewer: string;
  subject: string;
}

const TYPE_LABEL: Record<AdminReview["type"], string> = {
  reviews: "Player rating",
  match_reviews: "Match review",
  field_reviews: "Field review",
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function fetchReviews() {
    return fetch("/api/admin/reviews")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load reviews");
        return r.json();
      })
      .then((data) => setReviews(data.reviews))
      .catch(() => setError("Failed to load reviews."))
      .finally(() => setLoading(false));
  }

  function load() {
    setLoading(true);
    setError(null);
    fetchReviews();
  }

  useEffect(() => { fetchReviews(); }, []);

  async function remove(review: AdminReview) {
    if (!confirm("Delete this review? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/reviews/${review.id}?type=${review.type}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Delete failed");
      return;
    }
    setReviews((prev) => prev.filter((r) => r.id !== review.id));
    toast.success("Review deleted");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">Reviews</h1>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" />
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <Card key={`${r.type}-${r.id}`}>
              <CardContent className="p-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="outline">{TYPE_LABEL[r.type]}</Badge>
                    {r.rating != null && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-amber-600">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />{r.rating}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">{r.subject}</p>
                  {r.comment && <p className="text-sm text-muted-foreground mt-0.5">{r.comment}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    by {r.reviewer} · {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => remove(r)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
