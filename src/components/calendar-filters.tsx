"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CalendarFilter = "all" | "my_matches" | "organized" | "pending";

const FILTERS: { value: CalendarFilter; label: string }[] = [
  { value: "all", label: "All Matches" },
  { value: "my_matches", label: "My Matches" },
  { value: "organized", label: "Organized by Me" },
  { value: "pending", label: "Pending" },
];

interface CalendarFiltersProps {
  value: CalendarFilter;
  onChange: (filter: CalendarFilter) => void;
}

export function CalendarFilters({ value, onChange }: CalendarFiltersProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            value === f.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
