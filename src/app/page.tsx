import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Users,
  Zap,
  Shield,
  Calendar,
  ArrowRight,
  ChevronRight,
  Star,
  Clock,
  Trophy,
} from "lucide-react";
import { LandingHero } from "@/components/landing-hero";
import { HowItWorks } from "@/components/how-it-works";
import { Features } from "@/components/features";
import { SocialProof } from "@/components/social-proof";
import { CTASection } from "@/components/cta-section";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold font-[family-name:var(--font-barlow-condensed)]">
              MatchFinder
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="gap-1.5">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <LandingHero />
        <HowItWorks />
        <Features />
        <SocialProof />
        <CTASection />
      </main>

      <footer className="border-t bg-muted/30">
        <div className="container mx-auto py-12 px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold font-[family-name:var(--font-barlow-condensed)]">
                  MatchFinder
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Connecting football players and organizers in Banlieue Sud Tunis and beyond.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/register" className="hover:text-foreground transition-colors">Find Matches</Link></li>
                <li><Link href="/register" className="hover:text-foreground transition-colors">Create Match</Link></li>
                <li><Link href="/register" className="hover:text-foreground transition-colors">Nearby Fields</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Community</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/register" className="hover:text-foreground transition-colors">How it Works</Link></li>
                <li><Link href="/register" className="hover:text-foreground transition-colors">Trust & Safety</Link></li>
                <li><Link href="/register" className="hover:text-foreground transition-colors">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Location</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Banlieue Sud Tunis
                </li>
                <li className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  12 Fields Available
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} MatchFinder. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
