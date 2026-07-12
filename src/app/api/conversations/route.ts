import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PROFILE_SELECT = "id, name, image";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");

  const { data: participants } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", user.id);

  if (!participants || participants.length === 0) {
    return NextResponse.json([]);
  }

  const convIds = participants.map((p) => p.conversation_id);

  let query = supabase
    .from("conversations")
    .select(`
      *,
      conversation_participants!conversation_id(
        id, user_id, last_read_at,
        profiles!user_id(${PROFILE_SELECT})
      )
    `)
    .in("id", convIds);

  if (matchId) {
    query = query.eq("match_id", matchId);
  }

  const { data: conversations } = await query.order("created_at", { ascending: false });

  if (!conversations) return NextResponse.json([]);

  const enriched = await Promise.all(
    conversations.map(async (conv) => {
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, created_at, sender_id")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: unread } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .gt("created_at", (conv as Record<string, unknown>).conversation_participants
          ? ((conv as Record<string, unknown>).conversation_participants as Array<{ user_id: string; last_read_at: string }>)
              .find((p) => p.user_id === user.id)?.last_read_at ?? "1970-01-01"
          : "1970-01-01")
        .neq("sender_id", user.id);

      let otherUser = null;
      if (conv.type === "dm") {
        const other = conv.conversation_participants?.find(
          (p: { user_id: string }) => p.user_id !== user.id,
        );
        if (other?.profiles) {
          otherUser = {
            id: other.user_id,
            name: (other.profiles as Record<string, unknown>).name,
            image: (other.profiles as Record<string, unknown>).image,
          };
        }
      }

      return {
        ...conv,
        last_message: lastMsg ?? null,
        unread_count: unread ?? 0,
        other_user: otherUser,
      };
    }),
  );

  enriched.sort((a, b) => {
    const aTime = a.last_message?.created_at ?? a.created_at;
    const bTime = b.last_message?.created_at ?? b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError("Unauthorized", 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const targetId = body.targetId as string | undefined;
  if (!targetId) return jsonError("targetId is required");

  const { data: result, error } = await supabase.rpc("get_or_create_dm", {
    creator: user.id,
    target: targetId,
  });

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ conversation_id: result });
}
