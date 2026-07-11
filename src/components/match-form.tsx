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

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Sunday kick-about"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time">Time</Label>
          <Input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
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
        <Label htmlFor="maxPlayers">Max players</Label>
        <Input
          id="maxPlayers"
          type="number"
          min={2}
          max={50}
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={createMatch.isPending}>
        {createMatch.isPending ? "Creating..." : "Create match"}
      </Button>
    </form>
  );
}
