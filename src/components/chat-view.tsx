"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useMessages, useSendMessage } from "@/hooks/use-messages";
import { useRealtimeMessages } from "@/hooks/use-realtime-messages";
import { useTypingIndicator } from "@/hooks/use-typing-indicator";
import { MessageBubble } from "@/components/message-bubble";
import { MessageInput } from "@/components/message-input";
import { TypingIndicator } from "@/components/typing-indicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Message } from "@/types/chat";

interface ChatViewProps {
  conversationId: string;
}

export function ChatView({ conversationId }: ChatViewProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(conversationId);

  const sendMessage = useSendMessage();

  const allMessages: Message[] = data
    ? [...data.pages].reverse().flatMap((p) => p.messages)
    : [];

  useRealtimeMessages({
    conversationId,
    onMessage: (msg) => {
      if (msg.sender_id !== userId) {
        qc.setQueryData(
          ["messages", conversationId],
          (old: { pages: { messages: Message[]; nextCursor: string | null }[] } | undefined) => {
            if (!old) return old;
            const pages = [...old.pages];
            const lastIdx = pages.length - 1;
            const lastPage = pages[lastIdx];
            if (lastPage.messages.some((m) => m.id === msg.id)) return old;
            pages[lastIdx] = {
              ...lastPage,
              messages: [...lastPage.messages, msg],
            };
            return { ...old, pages };
          },
        );
      }
    },
  });

  const { typingUsers, broadcastTyping } = useTypingIndicator({
    conversationId,
    userId: userId ?? "",
    enabled: !!userId,
  });

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          setUserId(data.user.id);
          const { data: profile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", data.user.id)
            .maybeSingle();
          setUserName(profile?.name ?? data.user.email ?? "You");
        }
      } catch {
        // Supabase not configured
      }
    }
    load();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length]);

  useEffect(() => {
    if (!conversationId) return;
    fetch("/api/conversations/" + conversationId + "/read", { method: "PATCH" }).catch(() => {});
  }, [conversationId, allMessages.length]);

  const handleLoadOlder = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  function handleSend(content: string) {
    sendMessage.mutate({ conversationId, content });
  }

  function handleTyping() {
    broadcastTyping(userName || "Someone");
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] md:h-[calc(100vh-3rem)]">
      <ScrollArea ref={containerRef} className="flex-1 min-h-0">
        <div className="px-4 py-3 space-y-2.5">
          {hasNextPage && (
            <button
              onClick={handleLoadOlder}
              disabled={isFetchingNextPage}
              className="mx-auto block text-xs text-muted-foreground/60 hover:text-foreground transition-colors py-2 active:scale-95"
            >
              {isFetchingNextPage ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
                  Loading...
                </span>
              ) : (
                "Load older messages"
              )}
            </button>
          )}

          {allMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === userId}
            />
          ))}

          <TypingIndicator users={typingUsers} />
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <MessageInput
        onSend={handleSend}
        onTyping={handleTyping}
        disabled={sendMessage.isPending}
      />
    </div>
  );
}
