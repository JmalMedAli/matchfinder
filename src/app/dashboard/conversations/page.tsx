"use client";

import { useConversations } from "@/hooks/use-conversations";
import { ConversationList } from "@/components/conversation-list";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function ConversationsPage() {
  const { data: conversations, isPending } = useConversations();

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2"
      >
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <MessageCircle className="h-4 w-4 text-primary" />
        </div>
        <h1 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)]">
          Conversations
        </h1>
      </motion.div>

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
          <ConversationList conversations={conversations ?? []} />
        </motion.div>
      )}
    </div>
  );
}
