"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGeolocation } from "@/hooks/use-geolocation";
import { haversineDistance } from "@/lib/geo";
import { NearbyMatchCard } from "@/components/nearby-match-card";
import { DistanceFilter } from "@/components/distance-filter";
import { CityFallback } from "@/components/city-fallback";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MapPin, LocateOff, RefreshCw, Compass } from "lucide-react";
import type { Match } from "@/hooks/use-matches";
import { motion } from "framer-motion";

interface MatchesResponse {
  matches: Match[];
  total: number;
}

async function fetchAllOpenMatches(): Promise<MatchesResponse> {
  const res = await fetch("/api/matches?status=OPEN&pageSize=100");
  if (!res.ok) throw new Error("Failed to fetch matches");
  return res.json();
}

export default function NearbyPage() {
  const { lat, lng, permission, retry } = useGeolocation();
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [cityFilter, setCityFilter] = useState<string | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: ["matches", "open-all"],
    queryFn: fetchAllOpenMatches,
    staleTime: 30_000,
  });

  const matchesWithDistance = useMemo(() => {
    if (!data?.matches) return [];

    const items = data.matches
      .filter((m) => m.status === "OPEN")
      .map((match) => {
        const field = match.football_fields;
        let distance = Infinity;

        if (lat != null && lng != null && field?.latitude && field?.longitude) {
          distance = haversineDistance(
            lat,
            lng,
            Number(field.latitude),
            Number(field.longitude),
          );
        }

        return { match, distance };
      });

    if (lat != null && lng != null) {
      items.sort((a, b) => a.distance - b.distance);
    } else {
      items.sort(
        (a, b) =>
          new Date(a.match.date).getTime() - new Date(b.match.date).getTime(),
      );
    }

    return items;
  }, [data, lat, lng]);

  const filteredMatches = useMemo(() => {
    let result = matchesWithDistance;

    if (radiusKm != null && lat != null && lng != null) {
      result = result.filter((item) => item.distance <= radiusKm);
    }

    if (cityFilter) {
      result = result.filter(
        (item) => item.match.football_fields?.city === cityFilter,
      );
    }

    return result;
  }, [matchesWithDistance, radiusKm, cityFilter, lat, lng]);

  const hasLocation = permission === "granted" && lat != null && lng != null;
  const deniedLocation = permission === "denied";

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)] flex items-center gap-2">
          <Compass className="h-6 w-6 text-primary" />
          Nearby Matches
        </h1>
      </div>

      {permission === "loading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Getting your location...
        </div>
      )}

      {deniedLocation && (
        <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-800 dark:bg-orange-950">
          <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 dark:bg-orange-900">
            <LocateOff className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-orange-800 dark:text-orange-200">
              Location access denied
            </p>
            <p className="text-orange-700 dark:text-orange-300 text-xs">
              Select a city to filter matches near you.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={retry} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {hasLocation && (
          <DistanceFilter selected={radiusKm} onSelect={setRadiusKm} />
        )}
        {(deniedLocation || permission === "prompt") && (
          <CityFallback value={cityFilter} onChange={setCityFilter} />
        )}
      </div>

      {hasLocation && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-primary" />
          Showing matches sorted by distance from you
        </p>
      )}

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-destructive">Failed to load matches. Try again.</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <motion.div
            className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <MapPin className="h-7 w-7 text-muted-foreground" />
          </motion.div>
          <p className="text-muted-foreground font-medium">No matches found</p>
          {(radiusKm != null || cityFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRadiusKm(null);
                setCityFilter(null);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMatches.map(({ match, distance }, i) => (
            <NearbyMatchCard
              key={match.id}
              match={match}
              distanceKm={distance === Infinity ? 0 : distance}
              index={i}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
