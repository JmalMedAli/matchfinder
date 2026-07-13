"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGeolocation } from "@/hooks/use-geolocation";
import { haversineDistance } from "@/lib/geo";
import { NearbyMatchCard } from "@/components/nearby-match-card";
import { MatchMapView } from "@/components/match-map-view";
import { DistanceFilter } from "@/components/distance-filter";
import { CityFallback } from "@/components/city-fallback";
import { PositionFilter } from "@/components/position-filter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MapPin, LocateOff, RefreshCw, Compass, Search, Map, List } from "lucide-react";
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
  const [positionFilter, setPositionFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

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

    if (positionFilter) {
      result = result.filter(
        (item) => item.match.position_needed === positionFilter,
      );
    }

    return result;
  }, [matchesWithDistance, radiusKm, cityFilter, positionFilter, lat, lng]);

  const hasLocation = permission === "granted" && lat != null && lng != null;
  const deniedLocation = permission === "denied";

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Compass className="h-4 w-4 text-primary" />
        </div>
        <h1 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)]">
          Nearby Matches
        </h1>
      </div>

      {/* ── Location Status ── */}
      {permission === "loading" && (
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-3.5">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Getting your location...</span>
        </div>
      )}

      {deniedLocation && (
        <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-3.5 dark:border-orange-800 dark:bg-orange-950">
          <div className="h-9 w-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 dark:bg-orange-900">
            <LocateOff className="h-4.5 w-4.5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-orange-800 dark:text-orange-200">Location access denied</p>
            <p className="text-xs text-orange-700 dark:text-orange-300">Select a city to filter matches.</p>
          </div>
          <Button variant="outline" size="sm" onClick={retry} className="gap-1.5 shrink-0">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {/* ── Filter Chips ── */}
      <div className="flex flex-wrap items-center gap-2">
        {hasLocation && (
          <DistanceFilter selected={radiusKm} onSelect={setRadiusKm} />
        )}
        {(deniedLocation || permission === "prompt") && (
          <CityFallback value={cityFilter} onChange={setCityFilter} />
        )}
        <PositionFilter selected={positionFilter} onSelect={setPositionFilter} />
        <div className="flex items-center border rounded-xl overflow-hidden ml-auto">
          <button onClick={() => setViewMode("list")} className={`p-1.5 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            <List className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode("map")} className={`p-1.5 ${viewMode === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            <Map className="h-4 w-4" />
          </button>
        </div>
      </div>

      {hasLocation && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          Sorted by distance from you
        </div>
      )}

      {/* ── Loading Skeleton ── */}
      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-3">
            <Search className="h-7 w-7 text-destructive/50" />
          </div>
          <p className="text-destructive font-medium">Failed to load matches</p>
          <p className="text-sm text-muted-foreground mt-1">Try again later</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <motion.div
            className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <MapPin className="h-7 w-7 text-muted-foreground/50" />
          </motion.div>
          <p className="font-medium text-muted-foreground">No matches found</p>
          <p className="text-sm text-muted-foreground/60 mt-0.5">Try adjusting your filters</p>
          {(radiusKm != null || cityFilter) && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
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
        viewMode === "map" ? (
          <MatchMapView
            center={lat != null && lng != null ? [lat, lng] : undefined}
            matches={filteredMatches.map(({ match, distance }) => ({
              id: match.id,
              title: match.title,
              date: match.date,
              max_players: match.max_players,
              accepted_count: match.join_requests?.filter((r: any) => r.status === "ACCEPTED").length ?? 0,
              lat: match.football_fields?.latitude ?? 0,
              lng: match.football_fields?.longitude ?? 0,
              field_name: match.football_fields?.name ?? match.location,
              city: match.football_fields?.city ?? "",
              position_needed: match.position_needed,
              status: match.status,
            })).filter((m) => m.lat && m.lng)}
          />
        ) : (
          <div className="space-y-3">
            {filteredMatches.map(({ match, distance }, i) => (
              <NearbyMatchCard
                key={match.id}
                match={match}
                distanceKm={distance === Infinity ? 0 : distance}
                index={i}
              />
            ))}
          </div>
        )
      )}
    </motion.div>
  );
}
