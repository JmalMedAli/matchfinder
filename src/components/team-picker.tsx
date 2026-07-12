"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shuffle, RotateCcw, Users, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Player {
  id: string;
  name: string | null;
  image: string | null;
  position: string | null;
}

interface TeamPickerProps {
  players: Player[];
}

export function TeamPicker({ players }: TeamPickerProps) {
  const [teams, setTeams] = useState<Player[][]>([]);
  const [teamCount, setTeamCount] = useState(2);

  function shuffleTeams() {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const result: Player[][] = Array.from({ length: teamCount }, () => []);
    shuffled.forEach((player, i) => {
      result[i % teamCount].push(player);
    });
    setTeams(result);
  }

  function reset() {
    setTeams([]);
  }

  const teamColors = [
    "from-blue-500 to-blue-600",
    "from-red-500 to-red-600",
    "from-green-500 to-green-600",
    "from-purple-500 to-purple-600",
    "from-amber-500 to-amber-600",
    "from-pink-500 to-pink-600",
  ];

  const teamBorderColors = [
    "border-blue-500/30",
    "border-red-500/30",
    "border-green-500/30",
    "border-purple-500/30",
    "border-amber-500/30",
    "border-pink-500/30",
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold font-[family-name:var(--font-barlow-condensed)] flex items-center gap-2">
          <Shuffle className="h-5 w-5 text-primary" />
          Team Picker
        </h2>
        {teams.length > 0 && (
          <Button size="sm" variant="ghost" onClick={reset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Split {players.length} players into random teams.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Teams:</span>
                <div className="flex gap-1">
                  {[2, 3, 4].map((n) => (
                    <Button
                      key={n}
                      size="sm"
                      variant={teamCount === n ? "default" : "outline"}
                      className="h-7 w-7 p-0"
                      onClick={() => setTeamCount(n)}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </div>
              <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
                <Button onClick={shuffleTeams} className="w-full gap-2">
                  <Sparkles className="h-4 w-4" />
                  Pick Teams
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button onClick={shuffleTeams} variant="outline" className="w-full gap-2">
              <Shuffle className="h-4 w-4" />
              Shuffle Again
            </Button>
          </motion.div>

          <div className={`grid gap-3 ${teams.length === 2 ? "grid-cols-2" : teams.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {teams.map((team, ti) => (
              <motion.div
                key={ti}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: ti * 0.1 }}
              >
                <Card className={`${teamBorderColors[ti] ?? "border-primary/30"} border-2`}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className={`bg-gradient-to-r ${teamColors[ti] ?? teamColors[0]} text-white border-0`}>
                        Team {ti + 1}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{team.length} players</span>
                    </div>
                    <div className="space-y-1.5">
                      {team.map((player, pi) => (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: ti * 0.1 + pi * 0.03 }}
                          className="flex items-center gap-2 py-1"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={player.image ?? undefined} />
                            <AvatarFallback className="text-[9px]">{player.name?.[0] ?? "?"}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium truncate">{player.name ?? "Unknown"}</span>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
