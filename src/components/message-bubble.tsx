"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Copy, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { Message } from "@/types/chat";

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageActions({ content }: { content: string }) {
  function handleCopy() {
    navigator.clipboard.writeText(content).then(
      () => toast.success("Copied"),
      () => toast.error("Couldn't copy"),
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Message actions"
            size="icon-xs"
            variant="ghost"
            className="opacity-0 transition-opacity group-hover:opacity-100"
          />
        }
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className="h-3.5 w-3.5" /> Copy
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
        "group flex items-end gap-2 max-w-[85%]",
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
            "rounded-md px-3.5 py-2 text-sm",
            isOwn
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground",
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 mt-0.5",
            isOwn ? "flex-row-reverse mr-1" : "ml-1",
          )}
        >
          <p className="text-[10px] text-muted-foreground">
            {formatTime(message.created_at)}
          </p>
          <MessageActions content={message.content} />
        </div>
      </div>
    </div>
  );
}
