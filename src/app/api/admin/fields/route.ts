import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/admin";
import { jsonError, parseJsonBody } from "@/lib/api/helpers";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const { supabase, error } = await requireStaff();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  let query = supabase
    .from("football_fields")
    .select("id, name, city, address, rating, review_count, is_active, price_range")
    .order("name", { ascending: true });

  const safeQ = q?.replace(/[,()]/g, "");
  if (safeQ) query = query.ilike("name", `%${safeQ}%`);

  const { data, error: queryError } = await query;
  if (queryError) return jsonError(queryError.message, 500);

  return NextResponse.json({ fields: data ?? [] });
}

interface FieldBody {
  name: string;
  city: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  phone?: string | null;
  price_range?: string | null;
  surface_type?: string | null;
  dimensions?: string | null;
  is_indoor?: boolean;
  is_active?: boolean;
  has_parking?: boolean;
  has_changing_rooms?: boolean;
  has_showers?: boolean;
  has_lockers?: boolean;
  has_lighting?: boolean;
  has_cafeteria?: boolean;
  has_toilets?: boolean;
  has_equipment_rental?: boolean;
  has_wifi?: boolean;
  has_accessibility?: boolean;
  photos?: string[];
}

export async function POST(req: Request) {
  const { supabase, error } = await requireStaff();
  if (error) return error;

  if (!(await rateLimit(supabase, "admin-field-create"))) {
    return jsonError("Too many requests", 429);
  }

  const { body, error: bodyError } = await parseJsonBody<FieldBody>(req);
  if (bodyError) return bodyError;

  if (!body.name?.trim() || !body.city?.trim() || !body.address?.trim()) {
    return jsonError("Name, city, and address are required");
  }

  const { data, error: insertError } = await supabase
    .from("football_fields")
    .insert(body)
    .select()
    .single();

  if (insertError) return jsonError(insertError.message, 500);
  return NextResponse.json(data, { status: 201 });
}
