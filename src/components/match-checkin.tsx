"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { QrCode, CheckCircle, Keyboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MatchCheckinProps {
  matchId: string;
  isOrganizer: boolean;
}

export function MatchCheckin({ matchId, isOrganizer }: MatchCheckinProps) {
  const [mode, setMode] = useState<"view" | "code">("view");
  const [code, setCode] = useState("");
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkinCode, setCheckinCode] = useState<string | null>(null);

  useEffect(() => {
    if (isOrganizer) {
      const generated = Math.random().toString(36).substring(2, 8).toUpperCase();
      setCheckinCode(generated);
    }
  }, [isOrganizer]);

  async function handleCheckin() {
    const res = await fetch(`/api/matches/${matchId}/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: checkinCode || code }),
    });
    if (res.ok) {
      setCheckedIn(true);
      toast.success("Checked in!");
    } else {
      const err = await res.json();
      toast.error(err.error || "Check-in failed");
    }
  }

  if (checkedIn) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950 rounded-2xl p-4">
        <CheckCircle className="h-5 w-5" />
        <p className="text-sm font-medium">You&apos;re checked in!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {isOrganizer && (
          <Button variant={mode === "view" ? "default" : "outline"} size="sm" onClick={() => setMode("view")} className="gap-1.5">
            <QrCode className="h-3.5 w-3.5" /> QR Code
          </Button>
        )}
        <Button variant={mode === "code" ? "default" : "outline"} size="sm" onClick={() => setMode("code")} className="gap-1.5">
          <Keyboard className="h-3.5 w-3.5" /> Enter Code
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {mode === "view" && isOrganizer && checkinCode && (
          <motion.div key="qr" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="flex flex-col items-center gap-3 p-4 bg-card border rounded-2xl">
            <QRCodeSVG value={`matchfinder:${matchId}:${checkinCode}`} size={160} />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Check-in code</p>
              <p className="text-2xl font-bold font-mono tracking-widest">{checkinCode}</p>
            </div>
            <p className="text-xs text-muted-foreground text-center">Players scan this QR or enter the code above</p>
          </motion.div>
        )}

        {mode === "code" && (
          <motion.div key="code" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="flex gap-2">
            <Input
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="h-11 font-mono text-center text-lg tracking-widest"
            />
            <Button onClick={handleCheckin} disabled={code.length < 6} className="h-11 px-6">
              Check In
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
