import { redirect } from "next/navigation";
import { getStaffRole } from "@/lib/api/admin";

/**
 * Settings stays full-admin-only even though the outer admin layout admits
 * moderators — app configuration/maintenance mode isn't a moderation action.
 */
export default async function AdminSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isFullAdmin } = await getStaffRole();

  if (!isFullAdmin) {
    redirect("/dashboard/admin");
  }

  return <>{children}</>;
}
