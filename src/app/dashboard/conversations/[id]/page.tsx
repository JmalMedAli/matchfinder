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
    <div className="h-[calc(100dvh-8rem)] md:h-[calc(100vh-3rem)] flex flex-col -mx-4 md:mx-0">
      {/* ── Mobile Back Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-3 px-4 py-2.5 border-b md:border-0 md:px-0 md:py-0 md:mb-2"
      >
        <Link
          href="/dashboard/conversations"
          className="h-8 w-8 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </motion.div>

      <div className="flex-1 min-h-0">
        <ChatView conversationId={id} />
      </div>
    </div>
  );
}
