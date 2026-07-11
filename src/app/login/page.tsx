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

export default function LoginPage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");

  useEffect(() => {
    try {
      setSupabase(createClient());
    } catch {
      toast.error("Supabase is not configured. Set your .env variables.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogle() {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Log in to MatchFinder</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back. Enter your credentials to continue.
          </p>
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogle}>
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <div className="flex rounded-lg border overflow-hidden">
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              authMethod === "email" ? "bg-secondary" : "hover:bg-secondary/50"
            }`}
            onClick={() => setAuthMethod("email")}
          >
            Email
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              authMethod === "phone" ? "bg-secondary" : "hover:bg-secondary/50"
            }`}
            onClick={() => setAuthMethod("phone")}
          >
            Phone
          </button>
        </div>

        {authMethod === "email" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        ) : (
          <PhoneAuth />
        )}

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="underline hover:text-foreground">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
