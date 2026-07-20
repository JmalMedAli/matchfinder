"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin, Users, Zap } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function LandingHero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={ref} className="relative h-[85vh] min-h-[600px] overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={{ scale: videoScale }}
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
      </motion.div>

      <motion.div
        className="relative z-10 container mx-auto px-4 h-full flex items-center"
        style={{ y: textY, opacity: textOpacity }}
      >
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="secondary" className="mb-6 gap-1.5 bg-white/10 text-white border-white/20 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Active in Banlieue Sud Tunis
            </Badge>
          </motion.div>

          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight font-[family-name:var(--font-barlow-condensed)] leading-[1.1] text-white"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Find your next{" "}
            <span className="text-primary">football match</span>
          </motion.h1>

          <motion.p
            className="mt-6 text-lg md:text-xl text-white/70 max-w-2xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Connect with organizers, join games, and never miss a kick-about again.
            The easiest way to find and create football matches near you.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col sm:flex-row items-start gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="gap-2 w-full sm:w-auto text-base px-8 bg-primary hover:bg-primary/90">
                Find a match
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto text-base px-8 bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm">
                Create a match
              </Button>
            </Link>
          </motion.div>

          <motion.div
            className="mt-16 flex items-center gap-8 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">12</p>
                <p className="text-white/50 text-xs">Fields</p>
              </div>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">6</p>
                <p className="text-white/50 text-xs">Cities</p>
              </div>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">Free</p>
                <p className="text-white/50 text-xs">To join</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
