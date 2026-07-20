import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/admin";

export async function GET(req: Request) {
  const { supabase, error } = await requireStaff();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const role = searchParams.get("role");
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("profiles")
    .select(
      "id, name, email, image, city, role, status, matches_played, avg_rating, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  // Strip characters that are syntactically significant in a PostgREST
  // `.or()` filter string (`,()`) so a search term can't break or retarget
  // the filter — see docs/technical-debt.md's existing note on this pattern.
  const safeQ = q?.replace(/[,()]/g, "");
  if (safeQ) query = query.or(`name.ilike.%${safeQ}%,email.ilike.%${safeQ}%`);
  if (role) query = query.eq("role", role);
  if (status) query = query.eq("status", status);

  const { data, count, error: queryError } = await query;
  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 });

  return NextResponse.json({ users: data ?? [], total: count ?? 0, page, pageSize });
}
