import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Shared helpers for API route handlers (src/app/api/**).
 * Extracted from previously duplicated per-route code — behavior must stay
 * identical to the originals: error responses are `{ error: string }` JSON.
 */

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Full profile column list used when a route returns privacy-filterable contact fields. */
export const PROFILE_SELECT =
  "name, image, position, city, bio, phone, whatsapp, facebook, instagram, show_phone, show_whatsapp, show_facebook, show_instagram";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type AuthResult =
  | { supabase: SupabaseServerClient; user: User; error: null }
  | { supabase: null; user: null; error: NextResponse };

/** Cookie-session auth guard. On failure `error` is the 401 response to return. */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { supabase: null, user: null, error: jsonError("Unauthorized", 401) };
  }
  return { supabase, user, error: null };
}

type ParsedBody<T> = { body: T; error: null } | { body: null; error: NextResponse };

/** Safe `req.json()`. `message` preserves each route's original error string. */
export async function parseJsonBody<T = Record<string, unknown>>(
  req: Request,
  message = "Invalid JSON body",
): Promise<ParsedBody<T>> {
  try {
    return { body: (await req.json()) as T, error: null };
  } catch {
    return { body: null, error: jsonError(message) };
  }
}
