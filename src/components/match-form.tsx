"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCreateMatch } from "@/hooks/use-matches";
import { FootballFieldSelector } from "@/components/football-field-selector";
import type { FootballField } from "@/types/football-field";
import {
  Calendar, Clock, Users, FileText, ChevronRight, ChevronLeft,
  MapPin, Check, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  { id: "title", label: "Title", icon: FileText },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "location", label: "Location", icon: MapPin },
  { id: "players", label: "Players", icon: Users },
];

const POSITIONS = ["", "Goalkeeper", "Defender", "Midfielder", "Forward"];

export function MatchForm({ mode = "create" }: { mode?: "create" }) {
  const router = useRouter();
  const createMatch = useCreateMatch();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [field, setField] = useState<FootballField | null>(null);
  const [maxPlayers, setMaxPlayers] = useState("14");
  const [positionNeeded, setPositionNeeded] = useState("");

  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  function canAdvance() {
    switch (step) {
      case 0: return title.trim().length > 0;
      case 1: return date.length > 0 && time.length > 0;
      case 2: return field !== null;
      case 3: return parseInt(maxPlayers, 10) >= 2;
      default: return false;
    }
  }

  function handleNext() {
    if (step === 1 && date && time) {
      const dt = new Date(`${date}T${time}:00`);
      if (dt.getTime() <= Date.now()) {
        toast.error("Match date must be in the future");
        return;
      }
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  function handleSubmit() {
    const dateTime = new Date(`${date}T${time}:00`);
    if (dateTime.getTime() <= Date.now()) {
      toast.error("Match date must be in the future");
      return;
    }
    if (!field) {
      toast.error("Please select a football field");
      return;
    }

    createMatch.mutate(
      {
        title,
        description: description || undefined,
        date: dateTime.toISOString(),
        location: field.name,
        footballFieldId: field.id,
        maxPlayers: parseInt(maxPlayers, 10),
        positionNeeded: positionNeeded || undefined,
      },
      {
        onSuccess: (match) => {
          toast.success("Match created!");
          router.push(`/dashboard/matches/${match.id}`);
        },
        onError: (err) => {
          toast.error(err.message);
        },
      },
    );
  }

  const formattedDate = date
    ? new Date(date).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";
  const formattedTime = time || "";

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col">
      {/* ── Progress Bar ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </span>
          <span className="text-xs font-medium text-primary">{STEPS[step].label}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between mt-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-1 text-[10px] font-medium transition-colors ${
                  i <= step ? "text-primary" : "text-muted-foreground/40"
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center transition-colors ${
                    i < step
                      ? "bg-primary text-primary-foreground"
                      : i === step
                        ? "bg-primary/20 text-primary"
                        : "bg-muted"
                  }`}
                >
                  {i < step ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Icon className="h-2.5 w-2.5" />
                  )}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Step Content ── */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)] mb-1">
                    What&apos;s the match about?
                  </h2>
                  <p className="text-sm text-muted-foreground">Give your match a clear title.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title" className="flex items-center gap-1.5 text-sm">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    Title
                  </Label>
                  <Input
                    id="title"
                    placeholder="Sunday kick-about"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="h-12 text-base"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Casual 7v7 game, all skill levels welcome"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="text-base resize-none"
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)] mb-1">
                    When is it?
                  </h2>
                  <p className="text-sm text-muted-foreground">Pick the date and time.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center gap-1.5 text-sm">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time" className="flex items-center gap-1.5 text-sm">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Time
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className="h-12 text-base"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)] mb-1">
                    Where are you playing?
                  </h2>
                  <p className="text-sm text-muted-foreground">Select a football field.</p>
                </div>
                <FootballFieldSelector
                  value={field}
                  onSelect={setField}
                  onClear={() => setField(null)}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)] mb-1">
                    How many players?
                  </h2>
                  <p className="text-sm text-muted-foreground">Set the maximum number of players.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxPlayers" className="flex items-center gap-1.5 text-sm">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    Max players
                  </Label>
                  <Input
                    id="maxPlayers"
                    type="number"
                    min={2}
                    max={50}
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(e.target.value)}
                    required
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    Position needed (optional)
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {POSITIONS.map((pos) => (
                      <button
                        key={pos || "any"}
                        type="button"
                        onClick={() => setPositionNeeded(pos)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          positionNeeded === pos
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {pos || "Any"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Review Summary ── */}
                <div className="mt-6 p-4 bg-muted/50 rounded-2xl border space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Review your match</p>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{title}</p>
                        {description && <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{formattedDate}</p>
                        <p className="text-xs text-muted-foreground">{formattedTime}</p>
                      </div>
                    </div>
                    {field && (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{field.name}</p>
                          {field.city && <p className="text-xs text-muted-foreground">{field.city}</p>}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-sm font-medium">{maxPlayers} players max{positionNeeded ? ` — ${positionNeeded}` : ""}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Navigation Buttons ── */}
      <div className="sticky bottom-0 pt-4 pb-2 bg-background/80 backdrop-blur-xl -mx-4 px-4 border-t border-border/30">
        <div className="flex gap-3">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="h-12 px-5 rounded-xl font-semibold"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          {isLast ? (
            <motion.div className="flex-1" whileTap={{ scale: 0.97 }}>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={createMatch.isPending || !canAdvance()}
                className="w-full h-12 rounded-xl font-semibold text-base gap-2"
              >
                {createMatch.isPending ? (
                  "Creating..."
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Create Match
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div className="flex-1" whileTap={{ scale: 0.97 }}>
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canAdvance()}
                className="w-full h-12 rounded-xl font-semibold text-base gap-2"
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
