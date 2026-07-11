"use client";

import { motion } from "framer-motion";
import {
  MapPin,
  Clock,
  Users,
  Bell,
  Shield,
  Smartphone,
} from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Nearby matches",
    description: "See matches sorted by distance. Filter by 3, 5, 10, or 20 km from your location.",
  },
  {
    icon: Clock,
    title: "Real-time updates",
    description: "Get notified instantly when someone joins, cancels, or updates a match.",
  },
  {
    icon: Users,
    title: "Smart capacity",
    description: "Fields show remaining spots. Join requests are first-come, first-served.",
  },
  {
    icon: Bell,
    title: "Instant notifications",
    description: "Push notifications for join requests, approvals, and match updates.",
  },
  {
    icon: Shield,
    title: "Verified fields",
    description: "12 pre-loaded football fields in Banlieue Sud Tunis with accurate locations.",
  },
  {
    icon: Smartphone,
    title: "Mobile-first",
    description: "Designed for your phone. Bottom navigation, touch-friendly, works everywhere.",
  },
];

export function Features() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <motion.h2
            className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-barlow-condensed)]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Everything you need
          </motion.h2>
          <motion.p
            className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Built for the local football community
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                className="group rounded-2xl border bg-card p-6 transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -4, scale: 1.01 }}
              >
                <motion.div
                  className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4"
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Icon className="h-6 w-6 text-primary" />
                </motion.div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
