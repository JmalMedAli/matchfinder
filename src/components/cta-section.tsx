"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy } from "lucide-react";
import { motion } from "framer-motion";

export function CTASection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <motion.div
          className="relative rounded-3xl overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <video
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source src="/hero-video.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-primary/90" />
          <div className="absolute inset-0 bg-black/20" />

          <div className="relative px-8 py-16 md:px-16 md:py-20 text-center z-10">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-8">
              <Trophy className="h-9 w-9 text-white" />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white font-[family-name:var(--font-barlow-condensed)]">
              Ready to play?
            </h2>
            <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
              Join hundreds of players in Banlieue Sud Tunis. Your next match is one click away.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button
                  size="lg"
                  className="gap-2 text-base px-8 bg-white text-primary hover:bg-white/90"
                >
                  Get started free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
