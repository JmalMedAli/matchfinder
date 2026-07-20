"use client";

import { useState } from "react";
import { useConversations, useDeleteConversations } from "@/hooks/use-conversations";
import { ConversationList } from "@/components/conversation-list";
import { SelectionToolbar } from "@/components/selection-toolbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, ListChecks } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ConversationsPage() {
  const { data: conversations, isPending } = useConversations();
  const deleteConversations = useDeleteConversations();
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allIds = conversations?.map((c) => c.id) ?? [];
  const allSelected = allIds.length > 0 && selectedIds.size === allIds.length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(allIds));
  }

  function exitSelecting() {
    setSelecting(false);
    setSelectedIds(new Set());
  }

  function handleDelete() {
    const count = selectedIds.size;
    if (!confirm(`Remove ${count} conversation${count === 1 ? "" : "s"} from your list? The other participant keeps their copy.`)) {
      return;
    }
    deleteConversations.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        toast.success(`Removed ${count} conversation${count === 1 ? "" : "s"}`);
        exitSelecting();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)]">
            Conversations
          </h1>
        </div>
        {!selecting && !!conversations?.length && (
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground" onClick={() => setSelecting(true)}>
            <ListChecks className="h-3.5 w-3.5" />
            Select
          </Button>
        )}
      </motion.div>

      {selecting && (
        <SelectionToolbar
          selectedCount={selectedIds.size}
          totalCount={allIds.length}
          allSelected={allSelected}
          onToggleSelectAll={toggleSelectAll}
          onDelete={handleDelete}
          onCancel={exitSelecting}
          deleting={deleteConversations.isPending}
        />
      )}

      {isPending ? (
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="border rounded-2xl overflow-hidden bg-card"
        >
          <ConversationList
            conversations={conversations ?? []}
            selecting={selecting}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        </motion.div>
      )}
    </div>
  );
}
