"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/lib/api";

const COOLDOWN = 60;

interface VerifyEmailClientProps {
  token: string;
  email: string;
}

type State = "verifying" | "success" | "expired" | "error";

export function VerifyEmailClient({ token, email }: VerifyEmailClientProps) {
  const { update: updateSession } = useSession();
  const [state, setState] = useState<State>(token && email ? "verifying" : "expired");
  const [resendEmail, setResendEmail] = useState(email);
  const [verificationCode, setVerificationCode] = useState(token && token.length === 6 ? token : "");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendError, setResendError] = useState("");
  const autoVerifyStarted = useRef(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  async function verifyEmail(nextEmail: string, nextCode: string) {
    const cleanEmail = nextEmail.trim().toLowerCase();
    const cleanCode = nextCode.trim();
    if (!cleanEmail || cleanCode.length < 6) {
      setVerifyError("Enter the email and 6-digit verification code.");
      return;
    }

    setVerifyLoading(true);
    setVerifyError("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, token: cleanCode }),
      });

      if (res.ok) {
        // Refresh the JWT so middleware sees emailVerified: true immediately
        await updateSession({ user: { emailVerified: true } }).catch(() => null);
        setState("success");
        return;
      }

      const payload = await res.json().catch(() => null);
      const msg = payload?.message ?? "Invalid or expired verification code.";
      setVerifyError(msg);
      if (res.status === 400 || res.status === 401 || msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid")) {
        setState("expired");
      } else {
        setState("error");
      }
    } catch {
      setVerifyError("Unable to reach the server. Please try again.");
      setState("error");
    } finally {
      setVerifyLoading(false);
    }
  }

  useEffect(() => {
    if (token && email && !autoVerifyStarted.current) {
      autoVerifyStarted.current = true;
      verifyEmail(email, token);
    }
  }, [token, email]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    await verifyEmail(resendEmail, verificationCode);
  }

  async function handleResend() {
    if (!resendEmail.trim()) return;
    setResendLoading(true);
    setResendError("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-email/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resendEmail.trim().toLowerCase(),
          siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://nojai.app",
        }),
      });

      if (res.ok) {
        setResendCooldown(COOLDOWN);
        setVerificationCode("");
        setVerifyError("");
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
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-10 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Verifying your email code...</p>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-10 text-center">
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
        <Link href="/auth/login" className="block text-xs text-muted-foreground transition-colors hover:text-foreground">
          Sign in instead
        </Link>
      </div>
    );
  }

  // When we already know the address (the normal path — it comes through in
  // the URL after registering) there's no reason to make them type it again.
  const knowsEmail = Boolean(email);

  return (
    <div className="w-full max-w-md space-y-4">
      <form onSubmit={handleVerify} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
            <Mail className="h-7 w-7 text-primary" />
          </div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Enter your code</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {knowsEmail ? (
              <>
                We sent a 6-digit code to <span className="font-medium text-foreground">{resendEmail}</span>
              </>
            ) : (
              "Enter your email and the 6-digit code we sent you."
            )}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {!knowsEmail && (
            <div className="space-y-1.5">
              <Label htmlFor="verify-email">Email address</Label>
              <Input
                id="verify-email"
                type="email"
                value={resendEmail}
                onChange={(e) => {
                  setResendEmail(e.target.value);
                  setVerifyError("");
                  setResendError("");
                }}
                placeholder="your@email.com"
                disabled={verifyLoading || resendLoading}
              />
            </div>
          )}

          <Input
            id="verification-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            value={verificationCode}
            onChange={(e) => {
              setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setVerifyError("");
            }}
            placeholder="123456"
            disabled={verifyLoading || resendLoading}
            className="h-14 text-center font-display text-2xl tracking-[0.4em]"
          />

          {verifyError && <p className="text-center text-xs text-red-400">{verifyError}</p>}

          <Button
            type="submit"
            disabled={verifyLoading || !resendEmail.trim() || verificationCode.length !== 6}
            className="w-full gap-2"
          >
            {verifyLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Verify email
              </>
            )}
          </Button>
        </div>

        <div className="mt-5 border-t border-white/[0.06] pt-4 text-center">
          {resendCooldown > 0 ? (
            <p className="text-xs text-emerald-400">New code sent — check your inbox and spam folder.</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Didn&apos;t get it? Check your spam folder, or{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading || !resendEmail.trim()}
                className="font-medium text-primary underline underline-offset-4 disabled:opacity-50"
              >
                {resendLoading ? "sending…" : "send a new code"}
              </button>
              .
            </p>
          )}
          {resendError && <p className="mt-2 text-xs text-red-400">{resendError}</p>}
        </div>
      </form>

      <div className="text-center">
        <Link href="/auth/login" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
          Return to sign in
        </Link>
      </div>
    </div>
  );
}
