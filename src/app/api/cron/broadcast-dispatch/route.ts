import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyUsers } from "@/lib/notify";
import { requireCronSecret } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = requireCronSecret(req);
  if (authError) return authError;

  const supabase = await createClient();

  const { data: due, error } = await supabase.rpc("admin_dispatch_scheduled_broadcasts");
  if (error || !due || due.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const { data: profiles } = await supabase.from("profiles").select("id");
  const userIds = (profiles ?? []).map((p) => p.id as string);

  for (const broadcast of due) {
    if (userIds.length > 0) {
      await notifyUsers(userIds, {
        title: broadcast.title,
        message: broadcast.message,
        pushUrl: "/dashboard/notifications",
        skipEmail: false,
      });
    }
  }

  return NextResponse.json({ sent: due.length });
}
