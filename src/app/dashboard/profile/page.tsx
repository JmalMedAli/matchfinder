"use client";

import { ProfileForm } from "@/components/profile-form";
import { motion } from "framer-motion";

export default function ProfilePage() {
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">
        My Profile
      </h1>
      <ProfileForm />
    </motion.div>
  );
}
