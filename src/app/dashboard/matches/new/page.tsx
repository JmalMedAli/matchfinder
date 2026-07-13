"use client";

import { MatchForm } from "@/components/match-form";
import { motion } from "framer-motion";
import { ArrowLeft, Zap } from "lucide-react";
import Link from "next/link";

export default function NewMatchPage() {
  return (
    <motion.div
      className="min-h-[calc(100vh-8rem)]"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="h-9 w-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)]">
            Create a match
          </h1>
        </div>
      </div>
      <MatchForm mode="create" />
    </motion.div>
  );
}
