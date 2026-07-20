"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger,
} from "@/components/ui/dialog";
import { Flag } from "lucide-react";
import { toast } from "sonner";

const REASONS = ["Inappropriate behavior", "Spam or scam", "Fake profile / listing", "Safety concern", "Other"];

interface ReportDialogProps {
  targetType: "user" | "match" | "review" | "field";
  targetId: string;
  triggerLabel?: string;
}

export function ReportDialog({ targetType, targetId, triggerLabel = "Report" }: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_type: targetType, target_id: targetId, reason, description }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to submit report");
      return;
    }
    toast.success("Report submitted — our team will review it.");
    setOpen(false);
    setDescription("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="text-muted-foreground" />}>
        <Flag className="h-3.5 w-3.5" /> {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report</DialogTitle>
          <DialogDescription>Help keep MatchFinder safe. Our team reviews every report.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Details (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Add any context that would help our team…" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit report"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
