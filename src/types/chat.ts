export interface Conversation {
  id: string;
  type: "dm" | "group";
  match_id: string | null;
  creator_id: string | null;
  title: string | null;
  created_at: string;
  participants?: ConversationParticipant[];
  conversation_participants?: Array<{
    id: string;
    user_id: string;
    last_read_at: string;
    profiles?: { name: string | null; image: string | null };
  }>;
  other_user?: { id: string; name: string | null; image: string | null };
  last_message?: { content: string; created_at: string; sender_id: string } | null;
  unread_count?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_at: string;
  created_at: string;
  profiles?: { name: string | null; image: string | null };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  profiles?: { name: string | null; image: string | null };
}
