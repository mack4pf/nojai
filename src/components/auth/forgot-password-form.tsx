"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_BASE_URL } from "@/lib/api";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      // Always show neutral success regardless of whether account exists
      setSubmitted(true);
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/10">
            <Mail className="h-6 w-6 text-sky-400" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Check your email</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              If an account exists for <span className="font-medium text-foreground">{email}</span>, a password reset link has been sent. Check your inbox — it may take a minute.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Did not receive it? Check your spam folder or try again in a few minutes.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => { setSubmitted(false); setEmail(""); }}>
              Try a different email
            </Button>
            <Link href="/auth/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Return to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <Link
          href="/auth/login"
          className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
        <CardTitle>Reset your password</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Enter the email address associated with your account and we will send a reset link.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fp-email">Email address</Label>
            <Input
              id="fp-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="your@email.com"
              autoFocus
              required
              disabled={loading}
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</> : "Send reset link"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
