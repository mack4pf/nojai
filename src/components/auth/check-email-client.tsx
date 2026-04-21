"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

export function CheckEmailClient() {
  const searchParams = useSearchParams();
  const email = searchParams?.get("email") ?? "";

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

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
        setResent(true);
        toast.success("Verification email resent. Check your inbox and spam folder.");
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
            We sent a verification link to
          </p>
          {email && (
            <p className="mt-1 text-sm font-medium text-foreground break-all">{email}</p>
          )}

          <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-left text-sm text-amber-400">
            <p className="font-medium">Don&apos;t see it?</p>
            <p className="mt-1 text-amber-400/80">
              Check your spam or junk folder. Verification emails can sometimes end up there.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {resent ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Email resent — check your inbox and spam folder.</span>
              </div>
            ) : (
              <Button
                onClick={handleResend}
                disabled={resending}
                variant="outline"
                className="w-full"
              >
                {resending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {resending ? "Sending…" : "Resend verification email"}
              </Button>
            )}

            <p className="text-xs text-muted-foreground">
              Once you verify your email you&apos;ll be taken to your dashboard automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
