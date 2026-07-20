"use client";

import { Button } from "@/components/ui/button";
import { useBlocks, useToggleBlock } from "@/hooks/use-blocks";
import { UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface BlockButtonProps {
  userId: string;
  userName?: string | null;
}

/** Toggle button for blocking/unblocking another player. Blocking prevents
 * new DMs, messages in an existing DM, and join requests between the pair
 * (both directions) — enforced at the database layer, not just here. */
export function BlockButton({ userId, userName }: BlockButtonProps) {
  const { data: blocks } = useBlocks();
  const toggleBlock = useToggleBlock();
  const isBlocked = blocks?.some((b) => b.blocked_id === userId) ?? false;

  function handleClick() {
    if (
      !isBlocked &&
      !confirm(
        `Block ${userName ?? "this player"}? They won't be able to message you or send you join requests, and you won't be able to contact them either.`,
      )
    ) {
      return;
    }
    toggleBlock.mutate(userId, {
      onSuccess: (data) => toast.success(data.action === "blocked" ? "Player blocked" : "Player unblocked"),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Action failed"),
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      onClick={handleClick}
      disabled={toggleBlock.isPending}
    >
      {isBlocked ? (
        <>
          <UserCheck className="h-3.5 w-3.5" /> Unblock
        </>
      ) : (
        <>
          <UserX className="h-3.5 w-3.5" /> Block
        </>
      )}
    </Button>
  );
}
