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
import { MapPin, LocateOff, RefreshCw } from "lucide-react";
import type { Match } from "@/hooks/use-matches";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nearby Matches</h1>
      </div>

      {permission === "loading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Getting your location...
        </div>
      )}

      {deniedLocation && (
        <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm dark:border-orange-800 dark:bg-orange-950">
          <LocateOff className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-orange-800 dark:text-orange-200">
              Location access denied
            </p>
            <p className="text-orange-700 dark:text-orange-300">
              Select a city to filter matches near you.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={retry}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
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
        <p className="text-sm text-muted-foreground">
          <MapPin className="inline h-3.5 w-3.5 mr-1" />
          Showing matches sorted by distance from you
        </p>
      )}

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <p className="text-destructive text-center py-12">
          Failed to load matches. Try again.
        </p>
      ) : filteredMatches.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-muted-foreground">No matches found.</p>
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
          {filteredMatches.map(({ match, distance }) => (
            <NearbyMatchCard
              key={match.id}
              match={match}
              distanceKm={distance === Infinity ? 0 : distance}
            />
          ))}
        </div>
      )}
    </div>
  );
}
