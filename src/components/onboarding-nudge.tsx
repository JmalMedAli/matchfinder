"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { FOOTBALL_POSITIONS } from "@/types/profile";
import { TUNISIA_CITIES } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UserCircle2, X } from "lucide-react";

export function OnboardingNudge() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [dismissed, setDismissed] = useState(false);
  const [position, setPosition] = useState("");
  const [city, setCity] = useState("");

  if (dismissed || !profile || (profile.position && profile.city)) return null;

  async function handleSave() {
    try {
      await updateProfile.mutateAsync({
        position: position || profile!.position || undefined,
        city: city || profile!.city || undefined,
      });
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to save — try again from your profile");
    }
  }

  const canSave = (!profile.position && position) || (!profile.city && city);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-4 mb-5"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <UserCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Complete your profile</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Help organizers know who&apos;s joining
              </p>
            </div>
          </div>
          <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {!profile.position && (
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="h-9 flex-1 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Your position</option>
              {FOOTBALL_POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
          {!profile.city && (
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-9 flex-1 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Your city</option>
              {TUNISIA_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          <Button
            size="sm"
            className="rounded-lg shrink-0"
            disabled={!canSave || updateProfile.isPending}
            onClick={handleSave}
          >
            {updateProfile.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
