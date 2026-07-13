"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Player {
  id: string;
  name: string | null;
  image: string | null;
  position: string | null;
  city: string | null;
}

interface SearchResponse {
  players: Player[];
}

async function searchPlayers(query: string): Promise<SearchResponse> {
  const res = await fetch(`/api/players/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export function PlayerSearch() {
  const [query, setQuery] = useState("");

  const { data, isPending } = useQuery({
    queryKey: ["player-search", query],
    queryFn: () => searchPlayers(query),
    enabled: query.length >= 2,
    staleTime: 10_000,
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search players by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 h-11 rounded-xl"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {query.length >= 2 && data?.players && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="bg-card border rounded-2xl overflow-hidden divide-y divide-border/50 max-h-80 overflow-y-auto"
          >
            {isPending ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
            ) : data.players.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No players found</div>
            ) : (
              data.players.map((player) => (
                <div key={player.id} className="flex items-center gap-3 px-4 py-3 active:bg-muted/50 transition-colors cursor-pointer">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={player.image ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                      {player.name?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{player.name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {player.position}{player.city ? ` • ${player.city}` : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
