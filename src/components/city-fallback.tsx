"use client";

import { TUNISIA_CITIES } from "@/lib/geo";

interface CityFallbackProps {
  value: string | null;
  onChange: (city: string | null) => void;
}

export function CityFallback({ value, onChange }: CityFallbackProps) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <option value="">All cities</option>
      {TUNISIA_CITIES.map((city) => (
        <option key={city} value={city}>
          {city}
        </option>
      ))}
    </select>
  );
}
