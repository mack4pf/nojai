"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_BASE_URL } from "@/lib/api";

interface ResetPasswordFormProps {
  token: string;
  email: string;
}

type State = "idle" | "loading" | "success" | "expired" | "error";

export function ResetPasswordForm({ token, email }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [serverError, setServerError] = useState("");
  const [validationError, setValidationError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError("");
    setServerError("");

    if (password.length < 6) {
      setValidationError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setValidationError("Passwords do not match.");
      return;
    }

    setState("loading");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      const payload = await res.json().catch(() => null);

      if (res.status === 400 || res.status === 401 || res.status === 404) {
        // Treat as expired/invalid token
        const msg: string = payload?.message ?? "";
        if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid") || res.status === 401) {
          setState("expired");
        } else {
          setServerError(msg || "Reset failed. Please try again.");
          setState("error");
        }
        return;
      }

      if (!res.ok) {
        setServerError(payload?.message ?? "An error occurred. Please try again.");
        setState("error");
        return;
      }

      setState("success");
    } catch {
      setServerError("Unable to reach the server. Please check your connection.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Password updated</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your password has been reset. A confirmation has been sent to your email address.
            </p>
          </div>
          <Button asChild className="w-full mt-2">
            <Link href="/auth/login">Sign in with new password</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state === "expired") {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <span className="text-2xl">⏱</span>
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Link expired or invalid</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This password reset link has expired or is no longer valid. Reset links are single-use and expire after a short window.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full mt-2">
            <Link href="/auth/forgot-password">Request a new reset link</Link>
          </Button>
          <Link href="/auth/login" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">
            Return to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a strong password for <span className="font-medium text-foreground">{email}</span>.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rp-password">New password</Label>
            <div className="relative">
              <Input
                id="rp-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setValidationError(""); }}
                placeholder="Min. 6 characters"
                className="pr-10"
                disabled={state === "loading"}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rp-confirm">Confirm password</Label>
            <div className="relative">
              <Input
                id="rp-confirm"
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setValidationError(""); }}
                placeholder="Repeat your new password"
                className="pr-10"
                disabled={state === "loading"}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {(validationError || (state === "error" && serverError)) && (
            <p className="text-xs text-red-400">{validationError || serverError}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={state === "loading" || !password || !confirm}
          >
            {state === "loading" ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating…</>
            ) : "Set new password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
