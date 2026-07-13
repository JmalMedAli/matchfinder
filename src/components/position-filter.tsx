"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const POSITIONS = ["All", "Goalkeeper", "Defender", "Midfielder", "Forward"];

interface PositionFilterProps {
  selected: string | null;
  onSelect: (pos: string | null) => void;
}

export function PositionFilter({ selected, onSelect }: PositionFilterProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {POSITIONS.map((pos) => (
        <Button
          key={pos}
          variant={selected === pos || (pos === "All" && selected === null) ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(pos === "All" ? null : pos)}
          className={cn(
            "rounded-full",
            (selected === pos || (pos === "All" && selected === null)) && "bg-primary text-primary-foreground"
          )}
        >
          {pos}
        </Button>
      ))}
    </div>
  );
}
