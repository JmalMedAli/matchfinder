import { redirect } from "next/navigation";
import { getStaffRole } from "@/lib/api/admin";
import { AdminSubnav } from "@/components/admin/admin-subnav";

/**
 * Server-side gate for every /dashboard/admin/* page. Mirrors requireStaff()
 * (src/lib/api/admin.ts) but as a page-level redirect instead of a JSON 403 —
 * admits profiles.role in ('admin','moderator'), with the ADMIN_USER_ID lock
 * still specific to the 'admin' role. Settings and Notifications additionally
 * gate to full-admin-only via their own nested layout.tsx (src/app/dashboard/
 * admin/{settings,notifications}/layout.tsx). Children stay client
 * components; this layout only performs the auth check.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, isFullAdmin } = await getStaffRole();

  if (role !== "admin" && role !== "moderator") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <AdminSubnav isFullAdmin={isFullAdmin} />
      {children}
    </div>
  );
}
