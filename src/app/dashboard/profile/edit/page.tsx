"use client";

import Link from "next/link";
import { ProfileForm } from "@/components/profile-form";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

export default function ProfileEditPage() {
  return (
    <div className="min-h-screen pb-24">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link href="/dashboard/profile" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)] mb-6">
          Edit Profile
        </h1>
        <ProfileForm />
      </motion.div>
    </div>
  );
}
