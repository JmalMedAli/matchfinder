import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PROFILE_SELECT = "name, image";
const PAGE_SIZE = 50;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  const cursor = searchParams.get("cursor");

  if (!conversationId) return jsonError("conversationId is required");

  const { data: participant } = await supabase
    .from("conversation_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!participant) return jsonError("Access denied", 403);

  let query = supabase
    .from("messages")
    .select(`*, profiles!sender_id(${PROFILE_SELECT})`)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) {
    const { data: cursorMsg } = await supabase
      .from("messages")
      .select("created_at")
      .eq("id", cursor)
      .maybeSingle();
    if (cursorMsg) {
      query = query.lt("created_at", cursorMsg.created_at);
    }
  }

  const { data: messages, error } = await query;
  if (error) return jsonError(error.message, 500);

  const hasMore = (messages?.length ?? 0) > PAGE_SIZE;
  const sliced = hasMore ? messages!.slice(0, PAGE_SIZE) : messages ?? [];
  const reversed = sliced.reverse();

  return NextResponse.json({
    messages: reversed,
    nextCursor: hasMore ? reversed[0]?.id ?? null : null,
  });
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

  const conversationId = body.conversationId as string | undefined;
  const content = body.content as string | undefined;

  if (!conversationId) return jsonError("conversationId is required");
  if (!content?.trim()) return jsonError("Content is required");

  const { data: participant } = await supabase
    .from("conversation_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!participant) return jsonError("Access denied", 403);

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
    })
    .select(`*, profiles!sender_id(${PROFILE_SELECT})`)
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json(message, { status: 201 });
}
