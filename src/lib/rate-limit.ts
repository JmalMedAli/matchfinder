import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Durable, per-user rate limit backed by the `check_rate_limit` RPC
 * (see supabase/migration-admin-panel-security-hardening.sql). The RPC
 * derives the bucket key from the caller's own auth.uid() and looks up the
 * request/window threshold from `rate_limit_policies` server-side — `scope`
 * only selects which configured policy applies, it can't be used to target
 * another user's bucket or override the configured limit.
 */
export async function rateLimit(supabase: SupabaseServerClient, scope: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_rate_limit", { p_scope: scope });
  if (error) return false;
  return data === true;
}
