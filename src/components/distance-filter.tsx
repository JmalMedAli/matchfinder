"use client";

import { Button } from "@/components/ui/button";
import { DISTANCE_FILTERS } from "@/lib/geo";
import { cn } from "@/lib/utils";

interface DistanceFilterProps {
  selected: number | null;
  onSelect: (km: number | null) => void;
}

export function DistanceFilter({ selected, onSelect }: DistanceFilterProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant={selected === null ? "default" : "outline"}
        size="sm"
        onClick={() => onSelect(null)}
      >
        All
      </Button>
      {DISTANCE_FILTERS.map((f) => (
        <Button
          key={f.value}
          variant={selected === f.value ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(f.value)}
          className={cn(
            selected === f.value && "bg-primary text-primary-foreground",
          )}
        >
          {f.label}
        </Button>
      ))}
    </div>
  );
}
