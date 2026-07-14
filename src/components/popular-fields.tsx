"use client";

import { useAllFootballFields } from "@/hooks/use-football-fields";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Star, Users, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function PopularFields() {
  const { data: fields, isPending } = useAllFootballFields();

  const popular = (fields ?? [])
    .filter((f) => f.match_count > 0 || f.rating >= 4)
    .sort((a, b) => b.rating - a.rating || b.match_count - a.match_count)
    .slice(0, 5);

  if (isPending) {
    return (
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="shrink-0 w-[220px] h-[140px] rounded-2xl" />
        ))}
      </div>
    );
  }

  if (popular.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
      {popular.map((field, i) => (
        <motion.div
          key={field.id}
          className="shrink-0 w-[220px]"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: i * 0.06 }}
        >
          <Link href={`/dashboard/fields/${field.id}`}>
            <div className="relative rounded-2xl overflow-hidden h-[140px] group active:scale-[0.97] transition-transform">
              <img
                src={field.image_url || "/placeholder-field.jpg"}
                alt={field.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

              {/* Top badges */}
              <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                {field.rating > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5">
                    <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                    {field.rating.toFixed(1)}
                  </span>
                )}
                {field.match_count > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-primary/90 text-white rounded-full px-2 py-0.5">
                    <Users className="h-2.5 w-2.5" />
                    {field.match_count}
                  </span>
                )}
              </div>

              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white font-bold text-sm font-[family-name:var(--font-barlow-condensed)] truncate leading-tight">
                  {field.name}
                </p>
                <p className="flex items-center gap-1 text-white/70 text-[11px] mt-0.5">
                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{field.city}</span>
                </p>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
