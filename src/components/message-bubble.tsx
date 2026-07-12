"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/chat";

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageBubble({
  message,
  isOwn,
}: {
  message: Message;
  isOwn: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-end gap-2 max-w-[85%]",
        isOwn ? "ml-auto flex-row-reverse" : "",
      )}
    >
      {!isOwn && (
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarImage src={message.profiles?.image ?? undefined} />
          <AvatarFallback className="text-[10px]">
            {message.profiles?.name?.[0] ?? "?"}
          </AvatarFallback>
        </Avatar>
      )}

      <div>
        {!isOwn && message.profiles?.name && (
          <p className="text-[11px] text-muted-foreground mb-0.5 ml-1">
            {message.profiles.name}
          </p>
        )}
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2 text-sm",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted rounded-bl-md",
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <p
          className={cn(
            "text-[10px] text-muted-foreground mt-0.5",
            isOwn ? "text-right mr-1" : "ml-1",
          )}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}
