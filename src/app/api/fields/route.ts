import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  let query = supabase
    .from("football_fields")
    .select("*")
    .eq("is_active", true);

  if (search) {
    query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,address.ilike.%${search}%`);
  }

  const { data: fields, error } = await query.order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const fieldsWithCounts = await Promise.all(
    (fields ?? []).map(async (field) => {
      const { count } = await supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("football_field_id", field.id)
        .in("status", ["OPEN", "FULL"]);
      return { ...field, match_count: count ?? 0 };
    }),
  );

  return NextResponse.json(fieldsWithCounts);
}
