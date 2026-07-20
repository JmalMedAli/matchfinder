import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin";
import { jsonError, parseJsonBody } from "@/lib/api/helpers";

export async function GET() {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { data, error: queryError } = await supabase.from("app_settings").select("*").eq("id", true).single();
  if (queryError) return jsonError(queryError.message, 500);
  return NextResponse.json(data);
}

interface SettingsBody {
  maintenance_mode?: boolean;
  support_email?: string | null;
  default_search_radius_km?: number;
  default_max_players?: number;
  default_price_per_person?: number | null;
}

export async function PATCH(req: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { body, error: bodyError } = await parseJsonBody<SettingsBody>(req);
  if (bodyError) return bodyError;

  const { data, error: updateError } = await supabase
    .from("app_settings")
    .update(body)
    .eq("id", true)
    .select()
    .single();

  if (updateError) return jsonError(updateError.message, 500);
  return NextResponse.json(data);
}
