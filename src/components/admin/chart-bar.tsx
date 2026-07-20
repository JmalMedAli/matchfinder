"use client";

import { motion } from "framer-motion";

export interface ChartSeries {
  label: string;
  color: "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5";
}

interface ChartBarProps {
  categories: string[];
  series: ChartSeries[];
  values: number[][]; // values[seriesIndex][categoryIndex]
  height?: number;
}

const COLOR_CLASS: Record<ChartSeries["color"], string> = {
  "chart-1": "fill-chart-1",
  "chart-2": "fill-chart-2",
  "chart-3": "fill-chart-3",
  "chart-4": "fill-chart-4",
  "chart-5": "fill-chart-5",
};

/**
 * Lightweight grouped bar chart — plain SVG + Framer Motion, tokenized via
 * the existing --chart-1..5 CSS vars (globals.css). No charting dependency.
 */
export function ChartBar({ categories, series, values, height = 160 }: ChartBarProps) {
  const max = Math.max(1, ...values.flat());
  const groupWidth = 100 / categories.length;
  const barWidth = groupWidth / (series.length + 1);

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {categories.map((_, catIndex) => (
          <g key={catIndex}>
            {series.map((s, seriesIndex) => {
              const value = values[seriesIndex]?.[catIndex] ?? 0;
              const barHeight = (value / max) * (height - 20);
              const x = catIndex * groupWidth + barWidth * (seriesIndex + 0.5);
              return (
                <motion.rect
                  key={s.label}
                  x={x}
                  width={Math.max(barWidth - 1, 1)}
                  y={height - 20}
                  height={0}
                  rx={1}
                  className={COLOR_CLASS[s.color]}
                  animate={{ y: height - 20 - barHeight, height: barHeight }}
                  transition={{ duration: 0.5, delay: catIndex * 0.03 }}
                />
              );
            })}
          </g>
        ))}
      </svg>
      <div className="flex justify-between mt-1 px-0.5">
        {categories.map((c) => (
          <span key={c} className="text-[9px] text-muted-foreground">{c}</span>
        ))}
      </div>
      <div className="flex gap-4 mt-2">
        {series.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${COLOR_CLASS[s.color].replace("fill-", "bg-")}`} />
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
