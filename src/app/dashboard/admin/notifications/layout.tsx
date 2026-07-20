import { redirect } from "next/navigation";
import { getStaffRole } from "@/lib/api/admin";

/**
 * Notifications (broadcast) stays full-admin-only even though the outer
 * admin layout admits moderators — mass-messaging every user isn't a
 * moderation action.
 */
export default async function AdminNotificationsLayout({
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
