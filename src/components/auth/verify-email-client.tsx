"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/lib/api";

interface VerifyEmailClientProps {
  token: string;
  email: string;
}

type State = "verifying" | "success" | "expired" | "error";

export function VerifyEmailClient({ token, email }: VerifyEmailClientProps) {
  const [state, setState] = useState<State>("verifying");
  const [resendEmail, setResendEmail] = useState(email);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState("");

  useEffect(() => {
    async function verify() {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, email }),
        });

        if (res.ok) {
          setState("success");
          return;
        }

        const payload = await res.json().catch(() => null);
        const msg: string = payload?.message ?? "";
        if (
          res.status === 400 ||
          res.status === 401 ||
          msg.toLowerCase().includes("expired") ||
          msg.toLowerCase().includes("invalid")
        ) {
          setState("expired");
        } else {
          setState("error");
        }
      } catch {
        setState("error");
      }
    }

    if (token && email) {
      verify();
    } else {
      setState("expired");
    }
  }, [token, email]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResendLoading(true);
    setResendError("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-email/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail.trim().toLowerCase() }),
      });
      if (res.ok) {
        setResendSent(true);
      } else {
        const payload = await res.json().catch(() => null);
        setResendError(payload?.message ?? "Unable to resend. Please try again.");
      }
    } catch {
      setResendError("Unable to reach the server. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  if (state === "verifying") {
    return (
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.02] p-10 text-center space-y-4">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Verifying your email address…</p>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="w-full max-w-md rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-10 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Email verified</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your email address has been confirmed. Your account is fully active.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
        <Link href="/auth/login" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">
          Sign in instead
        </Link>
      </div>
    );
  }

  // expired or error — show resend form
  return (
    <div className="w-full max-w-md space-y-5">
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-8 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
          <Mail className="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">
            {state === "expired" ? "Link expired or invalid" : "Verification failed"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {state === "expired"
              ? "This verification link has expired or is no longer valid. Request a new one below."
              : "We could not verify this link. It may have already been used. Request a new one if needed."}
          </p>
        </div>
      </div>

      {resendSent ? (
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.07] px-4 py-3 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-400 mt-0.5" />
          <p className="text-xs text-sky-300">
            Verification email sent to <strong>{resendEmail}</strong>. Check your inbox — it may take a minute.
          </p>
        </div>
      ) : (
        <form onSubmit={handleResend} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3">
          <p className="text-sm font-medium">Resend verification email</p>
          <div className="space-y-1.5">
            <Label htmlFor="resend-email">Email address</Label>
            <Input
              id="resend-email"
              type="email"
              value={resendEmail}
              onChange={(e) => { setResendEmail(e.target.value); setResendError(""); }}
              placeholder="your@email.com"
              disabled={resendLoading}
            />
          </div>
          {resendError && <p className="text-xs text-red-400">{resendError}</p>}
          <Button type="submit" size="sm" disabled={resendLoading || !resendEmail.trim()} className="gap-2">
            {resendLoading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" />Sending…</>
            ) : (
              <><RefreshCw className="h-3.5 w-3.5" />Send verification email</>
            )}
          </Button>
        </form>
      )}

      <div className="text-center">
        <Link href="/auth/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Return to sign in
        </Link>
      </div>
    </div>
  );
}
