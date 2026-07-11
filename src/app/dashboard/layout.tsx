"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NavSidebar } from "@/components/nav-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <NavSidebar userId={userId} onUnreadCountChange={handleUnreadChange} unreadVersion={unreadVersion} />
      <main className="flex-1 min-w-0">
        <div className="container mx-auto p-4 pb-24 md:p-6 md:pb-6">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
