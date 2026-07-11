"use client";

import { MatchForm } from "@/components/match-form";
import { motion } from "framer-motion";

export default function NewMatchPage() {
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">
        Create a match
      </h1>
      <MatchForm mode="create" />
    </motion.div>
  );
}
