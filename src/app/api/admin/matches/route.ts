import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/admin";

export async function GET(req: Request) {
  const { supabase, error } = await requireStaff();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("matches")
    .select(
      "id, title, date, status, max_players, organizer_id, football_field_id, profiles!matches_organizer_id_fkey(name), football_fields(name, city)",
      { count: "exact" },
    )
    .order("date", { ascending: false })
    .range(from, to);

  const safeQ = q?.replace(/[,()]/g, "");
  if (safeQ) query = query.ilike("title", `%${safeQ}%`);
  if (status) query = query.eq("status", status);

  const { data, count, error: queryError } = await query;
  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 });

  return NextResponse.json({ matches: data ?? [], total: count ?? 0, page, pageSize });
}
