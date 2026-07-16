"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";

export function PhoneAuth() {
  const router = useRouter();
  const [supabase, setSupabase] = useState<SupabaseClient | null>(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  });
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("OTP sent! Check your phone.");
    setStep("otp");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (step === "otp") {
    return (
      <form onSubmit={handleVerifyOtp} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Enter the code sent to {phone}
        </p>
        <div className="space-y-2">
          <Label htmlFor="otp">Verification code</Label>
          <Input
            id="otp"
            type="text"
            inputMode="numeric"
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? "Verifying..." : "Verify"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setStep("phone")}>
            Back
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendOtp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+1234567890"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Sending code..." : "Send verification code"}
      </Button>
    </form>
  );
}
