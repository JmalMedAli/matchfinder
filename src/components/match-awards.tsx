"use client";

import { useMatchAwards, useVoteAward } from "@/hooks/use-match-awards";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Shield, Crown, Star } from "lucide-react";
import { motion } from "framer-motion";

interface MatchAwardsProps {
  matchId: string;
  participants: { id: string; name: string | null; image: string | null }[];
  currentUserId: string;
  motmPlayerId?: string | null;
  fairPlayPlayerId?: string | null;
}

export function MatchAwards({
  matchId,
  participants,
  currentUserId,
  motmPlayerId,
  fairPlayPlayerId,
}: MatchAwardsProps) {
  const { data: awardData } = useMatchAwards(matchId);
  const voteAward = useVoteAward(matchId);

  const otherParticipants = participants.filter((p) => p.id !== currentUserId);

  function handleVote(recipientId: string, awardType: string) {
    voteAward.mutate({ recipientId, awardType });
  }

  const motmWinner = motmPlayerId ? participants.find((p) => p.id === motmPlayerId) : null;
  const fairPlayWinner = fairPlayPlayerId ? participants.find((p) => p.id === fairPlayPlayerId) : null;

  return (
    <div className="space-y-4">
      {/* Winners announced */}
      {(motmWinner || fairPlayWinner) && (
        <div className="grid grid-cols-2 gap-3">
          {motmWinner && (
            <motion.div
              className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Crown className="h-6 w-6 text-amber-500 mx-auto mb-2" />
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-2">Man of the Match</p>
              <Avatar className="h-14 w-14 mx-auto mb-2 ring-2 ring-amber-500">
                <AvatarImage src={motmWinner.image ?? undefined} />
                <AvatarFallback className="bg-amber-100 text-amber-700 font-bold">
                  {motmWinner.name?.[0] ?? "?"}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm font-bold truncate">{motmWinner.name ?? "Player"}</p>
            </motion.div>
          )}
          {fairPlayWinner && (
            <motion.div
              className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-2xl p-4 text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
            >
              <Shield className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-2">Fair Play</p>
              <Avatar className="h-14 w-14 mx-auto mb-2 ring-2 ring-blue-500">
                <AvatarImage src={fairPlayWinner.image ?? undefined} />
                <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                  {fairPlayWinner.name?.[0] ?? "?"}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm font-bold truncate">{fairPlayWinner.name ?? "Player"}</p>
            </motion.div>
          )}
        </div>
      )}

      {/* Voting section */}
      {!motmPlayerId && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-semibold">Vote: Man of the Match</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {otherParticipants.map((p) => {
              const tally = awardData?.tally?.man_of_match?.[p.id]?.count ?? 0;
              const hasVoted = awardData?.tally?.man_of_match?.[p.id]?.voters?.includes(currentUserId);
              return (
                <button
                  key={p.id}
                  onClick={() => handleVote(p.id, "man_of_match")}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                    hasVoted ? "border-amber-500 bg-amber-500/5" : "border-border hover:bg-muted/50"
                  }`}
                  disabled={voteAward.isPending}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={p.image ?? undefined} />
                    <AvatarFallback className="text-xs">{p.name?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-medium truncate">{p.name ?? "Player"}</p>
                  </div>
                  {tally > 0 && (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                      {tally}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!fairPlayPlayerId && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-semibold">Vote: Fair Play</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {otherParticipants.map((p) => {
              const tally = awardData?.tally?.fair_play?.[p.id]?.count ?? 0;
              const hasVoted = awardData?.tally?.fair_play?.[p.id]?.voters?.includes(currentUserId);
              return (
                <button
                  key={p.id}
                  onClick={() => handleVote(p.id, "fair_play")}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                    hasVoted ? "border-blue-500 bg-blue-500/5" : "border-border hover:bg-muted/50"
                  }`}
                  disabled={voteAward.isPending}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={p.image ?? undefined} />
                    <AvatarFallback className="text-xs">{p.name?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-medium truncate">{p.name ?? "Player"}</p>
                  </div>
                  {tally > 0 && (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                      {tally}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
