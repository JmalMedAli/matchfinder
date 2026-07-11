"use client";

import { MatchForm } from "@/components/match-form";

export default function NewMatchPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create a match</h1>
      <MatchForm mode="create" />
    </div>
  );
}
