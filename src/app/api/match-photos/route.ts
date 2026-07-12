import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");

  if (!matchId || !UUID_RE.test(matchId)) {
    return NextResponse.json({ error: "matchId required" }, { status: 400 });
  }

  const { data } = await supabase
    .from("match_photos")
    .select("*, profiles!user_id(name, image)")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { matchId?: string; storagePath?: string; caption?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { matchId, storagePath, caption } = body;
  if (!matchId || !storagePath) {
    return NextResponse.json({ error: "matchId and storagePath required" }, { status: 400 });
  }
  if (!UUID_RE.test(matchId)) {
    return NextResponse.json({ error: "Invalid matchId" }, { status: 400 });
  }

  const { data: photo, error: insertError } = await supabase
    .from("match_photos")
    .insert({
      match_id: matchId,
      user_id: user.id,
      storage_path: storagePath,
      caption: caption?.trim() || null,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json(photo, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { photoId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { photoId } = body;
  if (!photoId || !UUID_RE.test(photoId)) {
    return NextResponse.json({ error: "photoId required" }, { status: 400 });
  }

  const { data: photo } = await supabase
    .from("match_photos")
    .select("storage_path, user_id")
    .eq("id", photoId)
    .single();

  if (!photo || photo.user_id !== user.id) {
    return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
  }

  await supabase.storage.from("match-photos").remove([photo.storage_path]);
  await supabase.from("match_photos").delete().eq("id", photoId);

  return NextResponse.json({ success: true });
}
