"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, MessageCircle } from "lucide-react";
import type { Conversation } from "@/types/chat";

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface ConversationListProps {
  conversations: Conversation[];
  selecting?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export function ConversationList({
  conversations,
  selecting = false,
  selectedIds,
  onToggleSelect,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
          <MessageCircle className="h-7 w-7 text-muted-foreground/30" />
        </div>
        <p className="font-medium text-muted-foreground">No conversations yet</p>
        <p className="text-sm text-muted-foreground/60 mt-0.5">
          Start a DM or join a match to chat
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {conversations.map((conv) => {
        const isDM = conv.type === "dm";
        const displayName = isDM
          ? conv.other_user?.name ?? "Unknown"
          : conv.title ?? "Match Chat";
        const avatar = isDM ? conv.other_user?.image : null;
        const unread = conv.unread_count ?? 0;
        const lastMsg = conv.last_message;
        const participantCount = conv.conversation_participants?.length ?? 0;

        const isSelected = selectedIds?.has(conv.id) ?? false;
        const rowClassName = "flex items-center gap-3 px-4 py-3.5 active:bg-muted/50 transition-colors";
        const content = (
          <>
            {selecting && (
              <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect?.(conv.id)} className="shrink-0" />
            )}
            <Avatar className="h-11 w-11 shrink-0">
              <AvatarImage src={avatar ?? undefined} />
              <AvatarFallback className={isDM ? "" : "bg-primary/10 text-primary"}>
                {isDM ? getInitials(displayName) : <Users className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm truncate">{displayName}</p>
                {lastMsg && (
                  <span className="text-[11px] text-muted-foreground/60 shrink-0">
                    {formatTime(lastMsg.created_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground truncate">
                  {lastMsg
                    ? lastMsg.content
                    : isDM
                      ? "Start a conversation"
                      : `${participantCount} participants`}
                </p>
                {unread > 0 && (
                  <Badge className="h-5 min-w-5 px-1 text-[10px] shrink-0 rounded-full">
                    {unread > 99 ? "99+" : unread}
                  </Badge>
                )}
              </div>
              {!isDM && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Users className="h-3 w-3 text-muted-foreground/50" />
                  <span className="text-[11px] text-muted-foreground/50">
                    {participantCount} member{participantCount !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </>
        );

        return selecting ? (
          <button
            key={conv.id}
            type="button"
            onClick={() => onToggleSelect?.(conv.id)}
            className={`w-full text-left ${rowClassName} ${isSelected ? "bg-primary/5" : ""}`}
          >
            {content}
          </button>
        ) : (
          <Link key={conv.id} href={`/dashboard/conversations/${conv.id}`} className={rowClassName}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
