import { NextResponse } from "next/server";
import { requireStaff, getStaffRole } from "@/lib/api/admin";

/** Lets admin client pages know whether the signed-in staff member is the
 * full admin (can change roles, see Settings/Notifications) or a moderator. */
export async function GET() {
  const { error } = await requireStaff();
  if (error) return error;

  const { role, isFullAdmin } = await getStaffRole();
  return NextResponse.json({ role, isFullAdmin });
}
