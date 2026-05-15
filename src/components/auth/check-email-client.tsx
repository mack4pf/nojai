"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

const COOLDOWN = 60;

export function CheckEmailClient() {
  const searchParams = useSearchParams();
  const email = searchParams?.get("email") ?? "";

  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function handleResend() {
    if (!email) {
      toast.error("No email address found. Please register again.");
      return;
    }
    setResending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-email/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setCooldown(COOLDOWN);
        toast.success("New code sent — check your inbox.");
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.message ?? "Failed to resend. Please try again.");
      }
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-glow backdrop-blur-sm text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a 6-digit verification code to
          </p>
          {email && (
            <p className="mt-1 text-sm font-medium text-foreground break-all">{email}</p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            Enter the code at{" "}
            <a href={`/auth/verify-email?email=${encodeURIComponent(email)}`} className="text-primary underline underline-offset-4">
              the verification page
            </a>
            .
          </p>

          <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-left text-sm text-amber-400">
            <p className="font-medium">Code not in inbox?</p>
            <p className="mt-1 text-amber-400/80">
              Check your spam or junk folder. If you still don&apos;t see it, request a new code below.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <Button
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              variant="outline"
              className="w-full"
            >
              {resending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </Button>

            {cooldown > 0 && (
              <div className="flex items-center justify-center gap-2 text-xs text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                New code sent — check your inbox and spam folder.
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Once your email is confirmed your account will be fully active.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
