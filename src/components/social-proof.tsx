"use client";

import { motion } from "framer-motion";
import { Wallet, ShieldCheck, Timer } from "lucide-react";

const valueProps = [
  {
    icon: Wallet,
    title: "Always free",
    text: "No booking fees, no subscriptions. Pay the field in cash like you always have — MatchFinder just gets the team together.",
  },
  {
    icon: ShieldCheck,
    title: "Built on trust",
    text: "Every match ends with ratings and reviews from the people who were actually there, so you know who you're playing with next time.",
  },
  {
    icon: Timer,
    title: "Find a game in minutes",
    text: "Browse matches near you, check the field, and request to join. No group chats, no chasing people down.",
  },
];

export function SocialProof() {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <motion.h2
            className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-barlow-condensed)]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Why players choose MatchFinder
          </motion.h2>
          <motion.p
            className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Built for the football community in Banlieue Sud Tunis
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {valueProps.map((v, i) => (
            <motion.div
              key={v.title}
              className="rounded-2xl border bg-card p-6 relative"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -6, scale: 1.02 }}
            >
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <v.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="font-semibold mb-2">{v.title}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{v.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
