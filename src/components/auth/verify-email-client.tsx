"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Mail, RefreshCw } from "lucide-react";
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

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
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

  return (
    <div className="w-full max-w-md space-y-5">
      <div className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
          <Mail className="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Verify with your email code</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the 6-digit code from your verification email. If you clicked the link in the email, we try to verify automatically.
          </p>
          <p className="mt-2 text-xs text-amber-400/80">
            Don&apos;t see the email? Check your <strong>spam or junk folder</strong> — verification emails sometimes land there.
          </p>
        </div>
      </div>

      {resendCooldown > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/[0.07] px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
          <p className="text-xs text-sky-300">
            New code sent to <strong>{resendEmail}</strong>. Check your inbox and spam folder.
          </p>
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <p className="text-sm font-medium">Enter verification code</p>
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
        <div className="space-y-1.5">
          <Label htmlFor="verification-code">6-digit code</Label>
          <Input
            id="verification-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={verificationCode}
            onChange={(e) => {
              setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setVerifyError("");
            }}
            placeholder="123456"
            disabled={verifyLoading || resendLoading}
          />
        </div>
        {verifyError && <p className="text-xs text-red-400">{verifyError}</p>}
        <Button type="submit" size="sm" disabled={verifyLoading || !resendEmail.trim() || verificationCode.length !== 6} className="w-full gap-2">
          {verifyLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verify email
            </>
          )}
        </Button>
      </form>

      <form onSubmit={handleResend} className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <p className="text-sm font-medium">Need a new code?</p>
        <p className="text-xs text-muted-foreground">We will send a fresh 6-digit code to the email above.</p>
        {resendError && <p className="text-xs text-red-400">{resendError}</p>}
        <Button type="submit" size="sm" variant="outline" disabled={resendLoading || resendCooldown > 0 || !resendEmail.trim()} className="gap-2">
          {resendLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </>
          )}
        </Button>
      </form>

      <div className="text-center">
        <Link href="/auth/login" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
          Return to sign in
        </Link>
      </div>
    </div>
  );
}
