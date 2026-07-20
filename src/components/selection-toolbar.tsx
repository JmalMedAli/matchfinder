"use client";

import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";

interface SelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  onDelete: () => void;
  onCancel: () => void;
  deleting?: boolean;
}

/** Shared "N selected" action bar for list pages with a select-then-bulk-delete flow (conversations, notifications). */
export function SelectionToolbar({
  selectedCount,
  totalCount,
  allSelected,
  onToggleSelectAll,
  onDelete,
  onCancel,
  deleting = false,
}: SelectionToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-1 py-1">
      <button
        type="button"
        onClick={onToggleSelectAll}
        className="text-xs font-medium text-primary hover:underline"
      >
        {allSelected ? "Deselect all" : `Select all (${totalCount})`}
      </button>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{selectedCount} selected</span>
        <Button
          variant="destructive"
          size="sm"
          className="h-7 text-xs gap-1 px-2"
          disabled={selectedCount === 0 || deleting}
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
