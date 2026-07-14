"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface MatchAward {
  id: string;
  award_type: "man_of_match" | "fair_play";
  recipient_id: string;
  voter_id: string;
  recipient?: { name: string | null; image: string | null };
  voter?: { name: string | null };
}

export interface AwardTally {
  [awardType: string]: {
    [recipientId: string]: { count: number; voters: string[] };
  };
}

interface AwardResponse {
  awards: MatchAward[];
  tally: AwardTally;
}

async function fetchAwards(matchId: string): Promise<AwardResponse> {
  const res = await fetch(`/api/matches/${matchId}/awards`);
  if (!res.ok) throw new Error("Failed to fetch awards");
  return res.json();
}

async function voteAward(matchId: string, recipientId: string, awardType: string): Promise<MatchAward> {
  const res = await fetch(`/api/matches/${matchId}/awards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipientId, awardType }),
  });
  if (!res.ok) throw new Error("Failed to vote");
  return res.json();
}

export function useMatchAwards(matchId: string) {
  return useQuery({
    queryKey: ["match-awards", matchId],
    queryFn: () => fetchAwards(matchId),
    enabled: !!matchId,
  });
}

export function useVoteAward(matchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recipientId, awardType }: { recipientId: string; awardType: string }) =>
      voteAward(matchId, recipientId, awardType),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["match-awards", matchId] });
      qc.invalidateQueries({ queryKey: ["match", matchId] });
    },
  });
}
