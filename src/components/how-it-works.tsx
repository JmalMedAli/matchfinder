"use client";

import { motion } from "framer-motion";
import { UserPlus, Search, MapPin, Gamepad2 } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Sign up",
    description: "Create your free account in seconds. Add your position and city.",
  },
  {
    icon: Search,
    title: "Find matches",
    description: "Browse upcoming matches near you. Filter by distance, date, and spots available.",
  },
  {
    icon: MapPin,
    title: "Pick a field",
    description: "See exactly where the match is. Get directions and travel time estimates.",
  },
  {
    icon: Gamepad2,
    title: "Play",
    description: "Show up, play, and connect with your local football community.",
  },
];

export function HowItWorks() {
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
            How it works
          </motion.h2>
          <motion.p
            className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            From sign-up to kick-off in four simple steps
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                className="relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -6 }}
              >
                <motion.div
                  className="text-center bg-card rounded-2xl p-6 border shadow-sm hover:shadow-lg transition-shadow duration-300"
                >
                  <motion.div
                    className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Icon className="h-7 w-7 text-primary" />
                  </motion.div>
                  <div className="text-xs font-semibold text-primary mb-2">
                    Step {i + 1}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-7 left-[60%] w-[80%] border-t border-dashed border-muted-foreground/20" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
