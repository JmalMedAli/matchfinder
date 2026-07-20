"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ChatView } from "@/components/chat-view";
import { BlockButton } from "@/components/block-button";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

interface DmParticipant {
  id: string;
  name: string | null;
}

export default function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [otherUser, setOtherUser] = useState<DmParticipant | null>(null);

  useEffect(() => {
    async function loadOtherParticipant() {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const { data: conversation } = await supabase
        .from("conversations")
        .select("type")
        .eq("id", id)
        .maybeSingle();
      if (conversation?.type !== "dm") return;

      const { data: participant } = await supabase
        .from("conversation_participants")
        .select("user_id, profiles!user_id(name)")
        .eq("conversation_id", id)
        .neq("user_id", auth.user.id)
        .maybeSingle();
      if (participant) {
        setOtherUser({
          id: participant.user_id,
          name: (participant.profiles as { name: string | null } | null)?.name ?? null,
        });
      }
    }
    loadOtherParticipant();
  }, [id]);

  return (
    <div className="h-[calc(100dvh-8rem)] md:h-[calc(100vh-3rem)] flex flex-col -mx-4 md:mx-0">
      {/* ── Mobile Back Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-between gap-3 px-4 py-2.5 border-b md:border-0 md:px-0 md:py-0 md:mb-2"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/conversations"
            className="h-8 w-8 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          {otherUser && <span className="text-sm font-medium">{otherUser.name ?? "Player"}</span>}
        </div>
        {otherUser && <BlockButton userId={otherUser.id} userName={otherUser.name} />}
      </motion.div>

      <div className="flex-1 min-h-0">
        <ChatView conversationId={id} />
      </div>
    </div>
  );
}
