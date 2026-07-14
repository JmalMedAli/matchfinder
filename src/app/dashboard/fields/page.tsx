"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useAllFootballFields } from "@/hooks/use-football-fields";
import { FieldCard, haversineDistance } from "@/components/field-card";
import { FieldMapView } from "@/components/field-map-view";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, SlidersHorizontal, Map, List, X, Building2, CloudSun,
  Star, Fence, ChevronDown, LocateFixed
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SURFACE_TYPES = ["All", "Artificial Grass", "Natural Grass", "Hybrid", "Concrete"];
const SORT_OPTIONS = ["Nearest", "Rating", "Matches", "Name"];
const DAY_OPTIONS = ["Any day", "Today", "This weekend"];

export default function FieldsPage() {
  const { data: fields, isPending } = useAllFootballFields();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [sortBy, setSortBy] = useState("Nearest");
  const [surfaceFilter, setSurfaceFilter] = useState("All");
  const [indoorFilter, setIndoorFilter] = useState<"all" | "indoor" | "outdoor">("all");
  const [ratingFilter, setRatingFilter] = useState(0);
  const [dayFilter, setDayFilter] = useState("Any day");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
      );
    }
  }, []);

  const filtered = useMemo(() => {
    if (!fields) return [];
    let result = [...fields];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.city.toLowerCase().includes(q) ||
          (f.address && f.address.toLowerCase().includes(q)),
      );
    }

    if (surfaceFilter !== "All") {
      result = result.filter((f) => f.surface_type === surfaceFilter);
    }

    if (indoorFilter !== "all") {
      result = result.filter((f) =>
        indoorFilter === "indoor" ? f.is_indoor : !f.is_indoor,
      );
    }

    if (ratingFilter > 0) {
      result = result.filter((f) => f.rating >= ratingFilter);
    }

    if (dayFilter !== "Any day") {
      const now = new Date();
      if (dayFilter === "Today") {
        const today = now.toISOString().slice(0, 10);
        result = result.filter((f) => {
          if (!f.opening_hours) return true;
          const todayKey = now.toLocaleDateString("en", { weekday: "long" }).toLowerCase();
          return f.opening_hours[todayKey] != null;
        });
      }
      if (dayFilter === "This weekend") {
        result = result.filter((f) => f.match_count > 0);
      }
    }

    if (sortBy === "Nearest" && userLocation) {
      result.sort((a, b) => {
        const distA = a.latitude && a.longitude
          ? haversineDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude)
          : 9999;
        const distB = b.latitude && b.longitude
          ? haversineDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude)
          : 9999;
        return distA - distB;
      });
    } else if (sortBy === "Rating") {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "Matches") {
      result.sort((a, b) => b.match_count - a.match_count);
    } else if (sortBy === "Name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [fields, search, surfaceFilter, indoorFilter, ratingFilter, dayFilter, sortBy, userLocation]);

  const activeFilterCount = [
    surfaceFilter !== "All",
    indoorFilter !== "all",
    ratingFilter > 0,
    dayFilter !== "Any day",
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">
          Football Fields
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Discover fields near you
        </p>
      </motion.div>

      {/* Search + Controls */}
      <motion.div
        className="flex gap-2 mb-3"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, area, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-muted/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-xl shrink-0 relative"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-1">
              {activeFilterCount}
            </span>
          )}
        </Button>
        <div className="flex rounded-xl border overflow-hidden shrink-0">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-11 w-11 rounded-none"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "map" ? "secondary" : "ghost"}
            size="icon"
            className="h-11 w-11 rounded-none"
            onClick={() => setViewMode("map")}
          >
            <Map className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Sort Bar */}
      <motion.div
        className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setSortBy(opt)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              sortBy === opt
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt}
          </button>
        ))}
      </motion.div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden mb-3"
          >
            <div className="bg-card border rounded-2xl p-4 space-y-4">
              {/* Indoor/Outdoor */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Type</p>
                <div className="flex gap-1.5">
                  {(["all", "outdoor", "indoor"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setIndoorFilter(opt)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        indoorFilter === opt
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {opt === "indoor" ? <Building2 className="h-3 w-3" /> : <CloudSun className="h-3 w-3" />}
                      {opt === "all" ? "All" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Surface */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Surface</p>
                <div className="flex gap-1.5 flex-wrap">
                  {SURFACE_TYPES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSurfaceFilter(s)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        surfaceFilter === s
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s === "All" ? "All" : s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Min Rating</p>
                <div className="flex gap-1.5">
                  {[0, 3, 3.5, 4, 4.5].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRatingFilter(r)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        ratingFilter === r
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r === 0 ? "Any" : (
                        <><Star className="h-3 w-3" /> {r}+</>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Availability</p>
                <div className="flex gap-1.5">
                  {DAY_OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDayFilter(d)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        dayFilter === d
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear */}
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-destructive"
                  onClick={() => {
                    setSurfaceFilter("All");
                    setIndoorFilter("all");
                    setRatingFilter(0);
                    setDayFilter("Any day");
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear all filters
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">
          {isPending ? "Loading..." : `${filtered.length} field${filtered.length !== 1 ? "s" : ""} found`}
        </p>
        {!userLocation && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 px-2"
            onClick={() => {
              navigator.geolocation?.getCurrentPosition(
                (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => {},
              );
            }}
          >
            <LocateFixed className="h-3 w-3 mr-1" />
            Locate me
          </Button>
        )}
      </div>

      {/* Content */}
      {isPending ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : viewMode === "map" ? (
        <div className="h-[60vh] rounded-2xl overflow-hidden border">
          <FieldMapView fields={filtered} userLocation={userLocation} />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          className="flex flex-col items-center py-20 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="font-semibold mb-1">No fields found</p>
          <p className="text-sm text-muted-foreground max-w-[240px]">
            Try adjusting your search or filters
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((field, i) => (
            <FieldCard
              key={field.id}
              field={field}
              index={i}
              userLocation={userLocation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
