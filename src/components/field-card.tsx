"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Star, Users, Building2, Fence, CloudSun, CloudRain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FieldListItem } from "@/hooks/use-football-fields";

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface FieldCardProps {
  field: FieldListItem;
  index?: number;
  userLocation?: { lat: number; lng: number } | null;
}

export function FieldCard({ field, index = 0, userLocation }: FieldCardProps) {
  const distance =
    userLocation && field.latitude && field.longitude
      ? haversineDistance(userLocation.lat, userLocation.lng, field.latitude, field.longitude)
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={`/dashboard/fields/${field.id}`}>
        <div className="group relative bg-card border rounded-2xl overflow-hidden active:scale-[0.98] transition-transform shadow-sm hover:shadow-md">
          {/* Photo */}
          <div className="relative h-44 overflow-hidden">
            <img
              src={field.image_url || "/placeholder-field.jpg"}
              alt={field.name}
              className="w-full h-full object-cover group-active:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            {/* Top badges */}
            <div className="absolute top-3 left-3 flex gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-white/90 backdrop-blur-sm text-foreground rounded-full px-2.5 py-1 shadow-sm">
                {field.is_indoor ? (
                  <><Building2 className="h-3 w-3" /> Indoor</>
                ) : (
                  <><CloudSun className="h-3 w-3" /> Outdoor</>
                )}
              </span>
              {field.price_range && (
                <span className="text-xs font-semibold bg-white/90 backdrop-blur-sm text-foreground rounded-full px-2.5 py-1 shadow-sm">
                  {field.price_range}
                </span>
              )}
            </div>

            {/* Match count badge */}
            {field.match_count > 0 && (
              <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-xs font-semibold bg-primary/90 text-white rounded-full px-2.5 py-1 shadow-sm">
                <Users className="h-3 w-3" />
                {field.match_count} match{field.match_count !== 1 ? "es" : ""}
              </span>
            )}

            {/* Rating */}
            {field.rating > 0 && (
              <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 shadow-sm">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                <span className="text-xs font-bold">{field.rating.toFixed(1)}</span>
                {field.review_count > 0 && (
                  <span className="text-[10px] text-muted-foreground">({field.review_count})</span>
                )}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                  {field.name}
                </h3>
                <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{field.address || field.city}</span>
                </p>
              </div>
            </div>

            {/* Surface + Distance */}
            <div className="flex items-center gap-2 mt-2.5">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                <Fence className="h-2.5 w-2.5 mr-1" />
                {field.surface_type}
              </Badge>
              {distance !== null && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                  {distance.toFixed(1)} km
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export { haversineDistance };
