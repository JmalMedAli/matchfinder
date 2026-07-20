"use client";

import { useState } from "react";
import { Share2, MessageCircle, Smartphone, Link2, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ShareMatchProps {
  title: string;
  date: string;
  location: string;
  matchId: string;
}

function buildShareText(title: string, date: string, location: string, url: string) {
  const d = new Date(date);
  const dateStr = d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `⚽ ${title}\n📅 ${dateStr} at ${timeStr}\n📍 ${location}\n\nJoin me on MatchFinder!\n${url}`;
}

function buildWhatsAppUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function buildSmsUrl(text: string) {
  return `sms:?body=${encodeURIComponent(text)}`;
}

export function ShareMatch({ title, date, location, matchId }: ShareMatchProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = typeof window !== "undefined"
    ? `${window.location.origin}/dashboard/matches/${matchId}`
    : "";
  const shareText = buildShareText(title, date, location, url);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url });
      } catch {
        // user cancelled
      }
    } else {
      setOpen(true);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`${shareText}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = shareText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <>
      {/* ── Share Button ── */}
      <button
        type="button"
        onClick={handleShare}
        className="h-9 w-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
      >
        <Share2 className="h-4 w-4 text-white" />
      </button>

      {/* ── Bottom Sheet (fallback) ── */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[70] bg-background rounded-t-3xl border-t px-4 pb-8 pt-3"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">Share match</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Message preview */}
              <div className="bg-muted/50 rounded-xl p-3 mb-5 text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                {shareText}
              </div>

              {/* Share options */}
              <div className="grid grid-cols-3 gap-3">
                <a
                  href={buildWhatsAppUrl(shareText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 py-3 rounded-xl bg-[#25D366]/10 active:scale-95 transition-transform"
                  onClick={() => setOpen(false)}
                >
                  <div className="h-12 w-12 rounded-full bg-[#25D366] flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-medium">WhatsApp</span>
                </a>

                <a
                  href={buildSmsUrl(shareText)}
                  className="flex flex-col items-center gap-2 py-3 rounded-xl bg-primary/10 active:scale-95 transition-transform"
                  onClick={() => setOpen(false)}
                >
                  <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                    <Smartphone className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <span className="text-xs font-medium">SMS</span>
                </a>

                <button
                  type="button"
                  className="flex flex-col items-center gap-2 py-3 rounded-xl bg-muted active:scale-95 transition-transform"
                  onClick={() => { handleCopy(); }}
                >
                  <div className="h-12 w-12 rounded-full bg-foreground flex items-center justify-center">
                    {copied ? (
                      <Check className="h-6 w-6 text-background" />
                    ) : (
                      <Link2 className="h-6 w-6 text-background" />
                    )}
                  </div>
                  <span className="text-xs font-medium">{copied ? "Copied!" : "Copy link"}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
