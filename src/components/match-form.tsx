"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useCreateMatch } from "@/hooks/use-matches";
import { FootballFieldSelector } from "@/components/football-field-selector";
import type { FootballField } from "@/types/football-field";
import { Calendar, Clock, Users, FileText } from "lucide-react";
import { motion } from "framer-motion";

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

export function MatchForm({ mode = "create" }: { mode?: "create" }) {
  const router = useRouter();
  const createMatch = useCreateMatch();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [field, setField] = useState<FootballField | null>(null);
  const [maxPlayers, setMaxPlayers] = useState("14");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

  const isFormValid = title && date && time && field && maxPlayers;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Title
              </Label>
              <Input
                id="title"
                placeholder="Sunday kick-about"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Casual 7v7 game, all skill levels welcome"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-1.5">
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
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Football Field</Label>
              <FootballFieldSelector
                value={field}
                onSelect={setField}
                onClear={() => setField(null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPlayers" className="flex items-center gap-1.5">
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
                className="h-11"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        custom={2}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover={isFormValid ? { scale: 1.01 } : undefined}
        whileTap={isFormValid ? { scale: 0.98 } : undefined}
      >
        <Button type="submit" disabled={createMatch.isPending || !isFormValid} className="w-full h-11">
          {createMatch.isPending ? "Creating..." : "Create match"}
        </Button>
      </motion.div>
    </form>
  );
}
