"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NavSidebar, MobileHeader } from "@/components/nav-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { useMatchReminders } from "@/hooks/use-match-reminders";
import { usePushRefresh } from "@/hooks/use-push-refresh";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadVersion, setUnreadVersion] = useState(0);

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          router.push("/login");
        } else {
          setUserId(data.user.id);
          setLoading(false);
        }
      } catch {
        router.push("/login");
      }
    }
    checkAuth();
  }, [router]);

  const handleUnreadChange = useCallback(() => {
    setUnreadVersion((v) => v + 1);
  }, []);

  useRealtimeNotifications({
    userId,
    onUnreadCountChange: handleUnreadChange,
  });

  useMatchReminders();
  usePushRefresh();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <NavSidebar userId={userId} onUnreadCountChange={handleUnreadChange} unreadVersion={unreadVersion} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header — replaces hamburger */}
        <MobileHeader userId={userId} onUnreadCountChange={handleUnreadChange} unreadVersion={unreadVersion} />

        <main className="flex-1">
          <div className="container mx-auto px-4 pt-4 pb-24 md:p-6 md:pb-6">{children}</div>
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav />
    </div>
  );
}
