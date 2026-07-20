"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Star, ChevronLeft, ChevronRight, Trophy, Shield, Check, X, Zap } from "lucide-react";

interface Participant {
  id: string;
  name: string | null;
  image: string | null;
}

interface PostMatchReviewProps {
  matchId: string;
  matchTitle: string;
  matchDate: string;
  fieldName: string | null;
  organizerName: string;
  participants: Participant[];
  currentUserId: string;
  isOrganizer: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const STEPS = ["Summary", "Rate", "Feedback", "Awards", "Stats"];

export function PostMatchReview({
  matchId,
  matchTitle,
  matchDate,
  fieldName,
  organizerName,
  participants,
  currentUserId,
  isOrganizer,
  onComplete,
  onSkip,
}: PostMatchReviewProps) {
  const [step, setStep] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [organizerRating, setOrganizerRating] = useState(0);
  const [fieldRating, setFieldRating] = useState(0);
  const [comment, setComment] = useState("");
  const [motmVote, setMotmVote] = useState<string | null>(null);
  const [fairPlayVote, setFairPlayVote] = useState<string | null>(null);
  const [goalsScored, setGoalsScored] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otherParticipants = participants.filter((p) => p.id !== currentUserId);
  const date = new Date(matchDate);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      // Submit review - gates the success screen; everything after this
      // is best-effort and shouldn't block it.
      const res = await fetch(`/api/matches/${matchId}/post-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallRating,
          organizerRating: isOrganizer ? undefined : organizerRating,
          fieldRating,
          comment: comment || undefined,
          goalsScored,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit review");

      // Submit awards
      if (motmVote) {
        await fetch(`/api/matches/${matchId}/awards`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientId: motmVote, awardType: "man_of_match" }),
        });
      }
      if (fairPlayVote) {
        await fetch(`/api/matches/${matchId}/awards`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientId: fairPlayVote, awardType: "fair_play" }),
        });
      }

      // Submit stats
      if (goalsScored > 0) {
        await fetch(`/api/matches/${matchId}/stats`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goalsScored }),
        });
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong submitting your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <motion.div
        className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-5"
        >
          <Check className="h-10 w-10 text-primary" />
        </motion.div>
        <h2 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)] mb-2">
          Review Submitted!
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-[260px]">
          Thanks for your feedback. Your ratings help build a trusted community.
        </p>
        <Button className="rounded-full px-8" onClick={onComplete}>
          Done
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b shrink-0">
        <button onClick={onSkip} className="text-sm text-muted-foreground">
          Skip
        </button>
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i <= step ? "bg-primary w-6" : "bg-muted w-1.5"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {step + 1}/{STEPS.length}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="summary" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)] mb-1">
                Match Summary
              </h2>
              <p className="text-sm text-muted-foreground mb-5">Review the match details</p>

              <div className="bg-card border rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-primary leading-none">{date.getDate()}</span>
                    <span className="text-[9px] font-medium text-primary/60 uppercase">{date.toLocaleString("default", { month: "short" })}</span>
                  </div>
                  <div>
                    <p className="font-semibold">{matchTitle}</p>
                    <p className="text-xs text-muted-foreground">{date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
                {fieldName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="h-3.5 w-3.5" /> {fieldName}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" /> Organizer: {organizerName}
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Participants</p>
                  <div className="flex flex-wrap gap-2">
                    {participants.map((p) => (
                      <div key={p.id} className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2.5 py-1">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={p.image ?? undefined} />
                          <AvatarFallback className="text-[8px]">{p.name?.[0] ?? "?"}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{p.name ?? "Player"}{p.id === currentUserId ? " (You)" : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="rate" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)] mb-1">
                Rate the Experience
              </h2>
              <p className="text-sm text-muted-foreground mb-5">How was the match?</p>

              <div className="space-y-5">
                <RatingRow label="Overall Match" rating={overallRating} onChange={setOverallRating} icon={<Star className="h-4 w-4" />} />
                {!isOrganizer && (
                  <RatingRow label="Organizer" rating={organizerRating} onChange={setOrganizerRating} icon={<Shield className="h-4 w-4" />} />
                )}
                {fieldName && <RatingRow label="Football Field" rating={fieldRating} onChange={setFieldRating} icon={<Zap className="h-4 w-4" />} />}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="feedback" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)] mb-1">
                Your Feedback
              </h2>
              <p className="text-sm text-muted-foreground mb-5">Tell us about your experience (optional)</p>

              <Textarea
                placeholder="How was the match? Any highlights, suggestions, or memories..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[160px] rounded-2xl text-sm"
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="awards" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)] mb-1">
                Match Awards
              </h2>
              <p className="text-sm text-muted-foreground mb-5">Vote for your teammates</p>

              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <p className="text-sm font-semibold">Man of the Match</p>
                  </div>
                  <div className="space-y-2">
                    {otherParticipants.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setMotmVote(motmVote === p.id ? null : p.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          motmVote === p.id ? "border-amber-500 bg-amber-500/5" : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={p.image ?? undefined} />
                          <AvatarFallback>{p.name?.[0] ?? "?"}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium flex-1 text-left">{p.name ?? "Player"}</span>
                        {motmVote === p.id && <Trophy className="h-4 w-4 text-amber-500" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-semibold">Fair Play</p>
                  </div>
                  <div className="space-y-2">
                    {otherParticipants.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setFairPlayVote(fairPlayVote === p.id ? null : p.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          fairPlayVote === p.id ? "border-blue-500 bg-blue-500/5" : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={p.image ?? undefined} />
                          <AvatarFallback>{p.name?.[0] ?? "?"}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium flex-1 text-left">{p.name ?? "Player"}</span>
                        {fairPlayVote === p.id && <Shield className="h-4 w-4 text-blue-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="stats" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)] mb-1">
                Your Stats
              </h2>
              <p className="text-sm text-muted-foreground mb-5">Record your performance</p>

              <div className="bg-card border rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Goals Scored</p>
                    <p className="text-xs text-muted-foreground">Enter the number of goals you scored</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setGoalsScored(Math.max(0, goalsScored - 1))}
                      className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-lg font-bold active:scale-90 transition-transform"
                    >
                      -
                    </button>
                    <span className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)] w-8 text-center">
                      {goalsScored}
                    </span>
                    <button
                      onClick={() => setGoalsScored(goalsScored + 1)}
                      className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold active:scale-90 transition-transform"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Actions */}
      <div className="shrink-0 px-4 py-4 border-t bg-background">
        {error && (
          <p className="text-sm text-destructive text-center mb-3">{error}</p>
        )}
        <div className="flex gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              className="h-12 px-5 rounded-xl font-semibold"
              onClick={() => setStep(step - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          <Button
            className="flex-1 h-12 rounded-xl font-semibold gap-2"
            disabled={submitting}
            onClick={() => {
              if (step === STEPS.length - 1) {
                handleSubmit();
              } else {
                setStep(step + 1);
              }
            }}
          >
            {submitting ? (
              "Submitting..."
            ) : step === STEPS.length - 1 ? (
              <>
                <Check className="h-4 w-4" />
                Submit Review
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function RatingRow({
  label,
  rating,
  onChange,
  icon,
}: {
  label: string;
  rating: number;
  onChange: (v: number) => void;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-card border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-primary">{icon}</span>
        <p className="text-sm font-semibold">{label}</p>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(rating === star ? 0 : star)}
            className="active:scale-90 transition-transform"
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                star <= rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
