"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Share2, Copy } from "lucide-react";

interface ShareProfileProps {
  playerId: string;
  playerName: string;
}

export function ShareProfile({ playerId, playerName }: ShareProfileProps) {
  const profileUrl = typeof window !== "undefined"
    ? `${window.location.origin}/player/${playerId}`
    : "";

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${playerName} on MatchFinder`, url: profileUrl });
      } catch {}
    } else {
      await navigator.clipboard.writeText(profileUrl);
      toast.success("Profile link copied!");
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5">
      <Share2 className="h-3.5 w-3.5" />
      Share Profile
    </Button>
  );
}
