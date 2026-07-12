"use client";

import { use } from "react";
import Link from "next/link";
import { ChatView } from "@/components/chat-view";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="max-w-2xl h-[calc(100vh-8rem)] md:h-[calc(100vh-3rem)] flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="pb-2"
      >
        <Link
          href="/dashboard/conversations"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to conversations
        </Link>
      </motion.div>

      <div className="flex-1 min-h-0">
        <ChatView conversationId={id} />
      </div>
    </div>
  );
}
