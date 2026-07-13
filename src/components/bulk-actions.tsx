"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, XCircle, Square, CheckSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BulkActionsProps {
  requests: Array<{ id: string; player_id: string; status: string }>;
  onBulkAction: (ids: string[], action: "ACCEPTED" | "REJECTED") => void;
  isPending: boolean;
}

export function BulkActions({ requests, onBulkAction, isPending }: BulkActionsProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const pendingRequests = requests.filter((r) => r.status === "PENDING");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === pendingRequests.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingRequests.map((r) => r.id)));
    }
  }

  if (pendingRequests.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground">
          {selected.size === pendingRequests.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>
        <span className="text-xs text-muted-foreground">{selected.size} selected</span>
      </div>

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { onBulkAction([...selected], "ACCEPTED"); setSelected(new Set()); }} disabled={isPending} className="gap-1.5 text-green-600 border-green-200 hover:bg-green-50">
                <CheckCircle className="h-3.5 w-3.5" /> Accept ({selected.size})
              </Button>
              <Button size="sm" variant="outline" onClick={() => { onBulkAction([...selected], "REJECTED"); setSelected(new Set()); }} disabled={isPending} className="gap-1.5 text-destructive border-red-200 hover:bg-red-50">
                <XCircle className="h-3.5 w-3.5" /> Reject ({selected.size})
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
