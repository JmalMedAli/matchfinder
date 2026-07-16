"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PhoneAuth } from "@/components/phone-auth";
import { Trophy, Mail, Phone } from "lucide-react";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState<SupabaseClient | null>(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");

  useEffect(() => {
    if (!supabase) {
      toast.error("Supabase is not configured. Set your .env variables.");
    }
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check your email for a confirmation link!");
    router.push("/login");
  }

  async function handleGoogle() {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Desktop Hero ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-primary/40 to-black/60" />
        <div className="relative text-center px-12 z-10">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-8">
            <Trophy className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white font-[family-name:var(--font-barlow-condensed)]">
            Join MatchFinder
          </h2>
          <p className="mt-4 text-lg text-white/80 max-w-sm mx-auto">
            Create your account and start finding football matches near you today.
          </p>
        </div>
      </div>

      {/* ── Form Side ── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10">
        <motion.div
          className="w-full max-w-sm mx-auto space-y-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-4">
            <Link href="/" className="mb-6">
              <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                <Trophy className="h-7 w-7 text-primary-foreground" />
              </div>
            </Link>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)]">
              Join MatchFinder
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Create your account to start playing</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Join the community and start playing.
            </p>
          </div>

          {/* Google button */}
          <Button
            variant="outline"
            className="w-full h-12 gap-2.5 rounded-xl text-base font-medium"
            onClick={handleGoogle}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Auth method toggle */}
          <div className="flex rounded-xl border overflow-hidden bg-muted/30 p-0.5">
            <button
              type="button"
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                authMethod === "email"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
              onClick={() => setAuthMethod("email")}
            >
              <Mail className="h-4 w-4" />
              Email
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                authMethod === "phone"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
              onClick={() => setAuthMethod("phone")}
            >
              <Phone className="h-4 w-4" />
              Phone
            </button>
          </div>

          {authMethod === "email" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="h-12 text-base"
                />
                <p className="text-[11px] text-muted-foreground/60">Minimum 8 characters</p>
              </div>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold" disabled={loading}>
                  {loading ? "Creating account..." : "Create account"}
                </Button>
              </motion.div>
            </form>
          ) : (
            <PhoneAuth />
          )}

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
