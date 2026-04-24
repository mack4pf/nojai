"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye, EyeOff, ArrowLeft, ChevronRight, Check,
  ExternalLink, Copy, Sparkles,
} from "lucide-react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { z } from "zod";

import Image from "next/image";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE_URL, api } from "@/lib/api";

// Types
type Source = "telegram" | "youtube" | "google" | "tiktok" | "ai" | "other";
type HasIQ  = "yes" | "no";
type Level  = "beginner" | "intermediate" | "expert";
type Usage  = "full_auto" | "alongside" | "other";

// Constants
const IQ_LINK    = "https://affiliate.iqoption.net/redir/?aff=785369&aff_model=revenue&afftrack=";
const BONUS_CODE = "Niels100";

// SVG logos
function TelegramLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#26A5E4" />
      <path d="M35 13.5L6.5 24.8c-.9.4-.9 1.6.1 1.9l7.1 2.3 2.7 8.5c.3.9 1.4 1.2 2.1.5l3.8-3.8 7.4 5.5c.9.6 2.1.1 2.3-.9l5-22.5c.4-1.6-1.1-3-2.7-2.8z" fill="white" />
    </svg>
  );
}
function YouTubeLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#FF0000" />
      <path d="M38.5 16.5a4 4 0 0 0-2.8-2.8C33.4 13 24 13 24 13s-9.4 0-11.7.6a4 4 0 0 0-2.8 2.9C9 18.8 9 24 9 24s0 5.2.5 7.5a4 4 0 0 0 2.8 2.8C14.6 35 24 35 24 35s9.4 0 11.7-.7a4 4 0 0 0 2.8-2.8C39 29.2 39 24 39 24s0-5.2-.5-7.5zM21 28.6v-9.2l7.8 4.6-7.8 4.6z" fill="white" />
    </svg>
  );
}
function GoogleLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M47.5 24.6c0-1.6-.1-3.2-.4-4.7H24v8.9h13.2a11.3 11.3 0 0 1-4.9 7.4v6.1h7.9C44.7 38 47.5 31.9 47.5 24.6z" fill="#4285F4" />
      <path d="M24 48c6.6 0 12.1-2.2 16.2-5.9l-7.9-6.1c-2.2 1.5-5 2.3-8.3 2.3-6.4 0-11.8-4.3-13.7-10.1H2.1v6.3A24 24 0 0 0 24 48z" fill="#34A853" />
      <path d="M10.3 28.2A14.4 14.4 0 0 1 9.5 24c0-1.5.3-2.9.8-4.2v-6.3H2.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.1 10.5l8.2-6.3z" fill="#FBBC05" />
      <path d="M24 9.5c3.6 0 6.8 1.2 9.4 3.7l7-7C36 2.2 30.5 0 24 0A24 24 0 0 0 2.1 13.5l8.2 6.3C12.2 13.8 17.6 9.5 24 9.5z" fill="#EA4335" />
    </svg>
  );
}
function TikTokLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#010101" />
      <path d="M31 9a7.5 7.5 0 0 0 7.5 7.5v-4a3.5 3.5 0 0 1-3.5-3.5H31z" fill="#EE1D52" />
      <path d="M38.5 16.5V21A12 12 0 0 1 31 18v11.8a10.5 10.5 0 1 1-10.5-10.5c.5 0 1 0 1.5.1v4.9a5.5 5.5 0 1 0 5.5 5.5V9h4a7.5 7.5 0 0 0 7.5 7.5z" fill="white" />
      <path d="M38.5 12.5v4A12 12 0 0 1 31 13V9h-4v29.8A7.5 7.5 0 1 1 20 31.3v-4.9a12 12 0 1 0 11 11.4V18.1a14.5 14.5 0 0 0 9 3v-5a7.5 7.5 0 0 1-1.5-3.6z" fill="#69C9D0" />
    </svg>
  );
}
function OpenAILogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 41 41" fill="none">
      <rect width="41" height="41" rx="10" fill="#0d0d0d" />
      <path d="M33.2 17.2a8.1 8.1 0 0 0-.7-6.6 8.2 8.2 0 0 0-8.8-3.9A8.2 8.2 0 0 0 17.5 4a8.2 8.2 0 0 0-7.8 5.7 8.2 8.2 0 0 0-5.5 4 8.2 8.2 0 0 0 1 9.6 8.2 8.2 0 0 0 .7 6.6 8.2 8.2 0 0 0 8.8 3.9 8.2 8.2 0 0 0 6.2 2.7 8.2 8.2 0 0 0 7.8-5.7 8.2 8.2 0 0 0 5.5-4 8.2 8.2 0 0 0-1-9.6zm-12 16.8a6 6 0 0 1-3.9-1.4l.2-.1 6.5-3.8a1 1 0 0 0 .5-.9v-9.2l2.8 1.6v7.7a6 6 0 0 1-6.1 4.1zM7.5 29.6a6 6 0 0 1-.7-4.1l.2.1 6.5 3.8a1 1 0 0 0 1 0L22.5 25v3.1l-8 4.6a6 6 0 0 1-7-3.1zM6.2 15.1a6 6 0 0 1 3.2-2.7v7.8a1 1 0 0 0 .5.9l8 4.6-2.8 1.6-6.5-3.8a6 6 0 0 1-2.4-8.4zm22.7 5.2-8-4.6 2.8-1.6 6.5 3.8a6 6 0 0 1-.9 11.1v-7.8a1 1 0 0 0-.4-.9zm2.7-4.1-.2-.1-6.5-3.8a1 1 0 0 0-1 0L16 16.8v-3.1l8-4.6a6 6 0 0 1 7.6 7.2zm-17.2 5.7-2.8-1.6V13a6 6 0 0 1 9.8-4.6l-.2.1-6.5 3.8a1 1 0 0 0-.5.9l.2 9.7z" fill="white" fillOpacity=".9" />
    </svg>
  );
}
function OtherLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#1e1e2e" />
      <circle cx="13" cy="20" r="2.5" fill="white" fillOpacity=".55" />
      <circle cx="20" cy="20" r="2.5" fill="white" fillOpacity=".55" />
      <circle cx="27" cy="20" r="2.5" fill="white" fillOpacity=".55" />
    </svg>
  );
}

// Survey data
const SOURCES: { value: Source; label: string; sub: string; Logo: React.FC<{ size?: number }> }[] = [
  { value: "telegram", label: "Telegram",     sub: "Channel or group",  Logo: TelegramLogo },
  { value: "youtube",  label: "YouTube",      sub: "Video or ad",       Logo: YouTubeLogo  },
  { value: "google",   label: "Google",       sub: "Search or ad",      Logo: GoogleLogo   },
  { value: "tiktok",   label: "TikTok",       sub: "Video or ad",       Logo: TikTokLogo   },
  { value: "ai",       label: "ChatGPT / AI", sub: "AI recommendation", Logo: OpenAILogo   },
  { value: "other",    label: "Other",        sub: "Word of mouth etc", Logo: OtherLogo    },
];

const LEVELS: { value: Level; label: string; desc: string; emoji: string }[] = [
  { value: "beginner",     emoji: "🌱", label: "Beginner",     desc: "New to trading or just getting started."     },
  { value: "intermediate", emoji: "📈", label: "Intermediate", desc: "I've traded before and know the basics."     },
  { value: "expert",       emoji: "⚡",    label: "Expert",       desc: "I trade regularly and know strategies well." },
];

const USAGE_OPTIONS: { value: Usage; label: string; desc: string; emoji: string }[] = [
  { value: "full_auto", emoji: "🤖", label: "Full Automation",  desc: "Let the bot handle all trades for me."   },
  { value: "alongside", emoji: "🤝", label: "Trade Alongside",  desc: "I'll also place my own trades manually." },
  { value: "other",     emoji: "🤔", label: "Still Deciding",   desc: "I'll figure it out as I go."             },
];

// Schema
const schema = z
  .object({
    name:            z.string().min(2, "Name must be at least 2 characters"),
    email:           z.string().email("Invalid email"),
    password:        z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof schema>;

// OptionTile
function OptionTile({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-150",
        "border-white/10 bg-white/[0.03] hover:border-primary/40 hover:bg-primary/[0.04]",
        selected && "border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]",
        className,
      )}
    >
      {children}
      <span
        className={cn(
          "ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 transition-all duration-150",
          selected && "border-transparent bg-primary",
        )}
      >
        {selected && <Check className="h-3 w-3 text-primary-foreground" />}
      </span>
    </button>
  );
}

interface RegisterFormProps {
  selectedPlan?: string;
}

export function RegisterForm({ selectedPlan }: RegisterFormProps) {
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  const [phase, setPhase]           = useState<"register" | "onboarding">("register");
  const [surveyStep, setSurveyStep] = useState(1);
  const [userName, setUserName]     = useState("");
  const [isNavigating, setIsNavigating] = useState(false);

  const [registeredEmail, setRegisteredEmail] = useState("");

  const [source, setSource] = useState<Source | null>(null);
  const [hasIQ, setHasIQ]   = useState<HasIQ | null>(null);
  const [level, setLevel]   = useState<Level | null>(null);
  const [usage, setUsage]   = useState<Usage | null>(null);

  // Affiliate code
  const searchParams = useSearchParams();
  const [affiliateCode, setAffiliateCode] = useState("");

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setAffiliateCode(ref);
  }, [searchParams]);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  async function onRegister(values: RegisterValues) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.name,
          email: values.email,
          password: values.password,
          affiliateCode: affiliateCode || undefined,
        }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        setIsSubmitting(false);
        toast.error(payload?.errors?.[0]?.message ?? payload?.message ?? "Unable to register");
        return;
      }

      const loginResult = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      setIsSubmitting(false);

      if (loginResult?.error) {
        toast.error(loginResult.error);
        return;
      }

      setUserName(values.name.split(" ")[0]);
      setRegisteredEmail(values.email);
      setPhase("onboarding");
      setSurveyStep(1);
    } catch (err) {
      setIsSubmitting(false);
      toast.error(err instanceof Error ? err.message : "Unable to reach the server");
    }
  }

  async function finishSurvey() {
    setIsNavigating(true);
    try {
      await api.post("/user/onboarding-survey", {
        referralSource: source,
        hasIQAccount:   hasIQ === "yes",
        tradingLevel:   level,
        botUsage:       usage,
      });
    } catch {
      // Don't block navigation if survey fails
    }
    const emailParam = registeredEmail ? `?email=${encodeURIComponent(registeredEmail)}` : "";
    router.push(`/auth/check-email${emailParam}`);
    router.refresh();
  }

  function skipOnboarding() {
    setIsNavigating(true);
    const emailParam = registeredEmail ? `?email=${encodeURIComponent(registeredEmail)}` : "";
    router.push(`/auth/check-email${emailParam}`);
    router.refresh();
  }

  const TOTAL_STEPS = 5;

  function canContinue() {
    if (surveyStep === 1) return true;
    if (surveyStep === 2) return source !== null;
    if (surveyStep === 3) return hasIQ !== null;
    if (surveyStep === 4) return level !== null;
    if (surveyStep === 5) return usage !== null;
    return false;
  }

  function handleContinue() {
    if (surveyStep < TOTAL_STEPS) setSurveyStep((s) => s + 1);
    else finishSurvey();
  }

  // Registration phase
  if (phase === "register") {
    const errors = form.formState.errors;
    return (
      <div className="w-full">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-glow backdrop-blur-sm">
          <div className="mb-7">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Step 1 of 2 — Account details
            </span>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">Create your account</h2>
            <p className="mt-1 text-sm text-muted-foreground">Takes less than a minute.</p>
          </div>

          <form className="space-y-4" onSubmit={form.handleSubmit(onRegister)}>
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" placeholder="Your name" {...form.register("name")} />
              {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...form.register("email")} />
              {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  className="pr-12"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat password"
                  className="pr-12"
                  {...form.register("confirmPassword")}
                />
                <button
                  type="button"
                  aria-label={showConfirm ? "Hide" : "Show"}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowConfirm((v) => !v)}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-danger">{errors.confirmPassword.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="affiliateCode">Have a referral code? (Optional)</Label>
              <Input
                id="affiliateCode"
                placeholder="Enter referral code"
                value={affiliateCode}
                onChange={(e) => setAffiliateCode(e.target.value)}
              />
            </div>
            <Button type="submit" className="mt-2 w-full gap-2" disabled={isSubmitting}>
              {isSubmitting ? "Creating account…" : <><span>Continue</span><ChevronRight className="h-4 w-4" /></>}
            </Button>
          </form>

          {selectedPlan && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Selected plan: <span className="font-medium text-foreground">{selectedPlan.toUpperCase()}</span>
            </p>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  // Onboarding phase
  const progressPct = surveyStep === 1 ? 0 : ((surveyStep - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-3">
          {surveyStep > 1 ? (
            <button
              type="button"
              onClick={() => setSurveyStep((s) => Math.max(1, s - 1))}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <div className="h-8 w-8 shrink-0" />
          )}
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Step 2 of 2 — Setup
              </span>
              {surveyStep > 1 && (
                <span className="text-[11px] text-muted-foreground/60">{surveyStep - 1} / {TOTAL_STEPS - 1}</span>
              )}
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div key={surveyStep} className="animate-fade-up">
        {surveyStep === 1 && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-center shadow-glow">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Welcome, {userName}!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your account is all set. Before you dive in, we&apos;d love to learn a little about you — it helps us set up your workspace perfectly.
            </p>
            <p className="mt-2 text-xs text-muted-foreground/50">4 quick questions · Less than 1 minute</p>
            <Button className="mt-6 w-full gap-2" onClick={handleContinue}>
              <span>Let&apos;s Go</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={skipOnboarding}
              disabled={isNavigating}
              className="mt-3 w-full py-1 text-center text-xs text-muted-foreground/50 transition-colors hover:text-muted-foreground"
            >
              Skip setup, go straight to dashboard
            </button>
          </div>
        )}

        {surveyStep === 2 && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-glow">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">Question 1 of 4</p>
            <h3 className="font-display text-xl font-semibold tracking-tight">How did you find NOJAI?</h3>
            <p className="mb-5 mt-1 text-sm text-muted-foreground">Pick whichever fits best.</p>
            <div className="grid grid-cols-2 gap-2.5">
              {SOURCES.map(({ value, label, sub, Logo }) => (
                <OptionTile key={value} selected={source === value} onClick={() => setSource(value)}>
                  <Logo size={26} />
                  <div className="min-w-0 flex-1 pr-1">
                    <p className="truncate text-sm font-medium leading-tight">{label}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{sub}</p>
                  </div>
                </OptionTile>
              ))}
            </div>
          </div>
        )}

        {surveyStep === 3 && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-glow">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">Question 2 of 4</p>
            <h3 className="font-display text-xl font-semibold tracking-tight">Do you have an IQ Option account?</h3>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">
              NOJAI connects to IQ Option to execute your trades automatically.
            </p>
            <div className="mb-5 overflow-hidden rounded-xl border border-white/10">
              <Image
                src="/autobot-assets/iqoptionplusai.jpg"
                alt="IQ Option + NOJAI Bot"
                width={400}
                height={160}
                className="w-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-2.5">
              <OptionTile selected={hasIQ === "yes"} onClick={() => setHasIQ("yes")}>
                <span className="text-xl leading-none">✅</span>
                <div>
                  <p className="text-sm font-medium">Yes, I have one</p>
                  <p className="text-xs text-muted-foreground">Ready to connect</p>
                </div>
              </OptionTile>
              <OptionTile selected={hasIQ === "no"} onClick={() => setHasIQ("no")}>
                <span className="text-xl leading-none">❌</span>
                <div>
                  <p className="text-sm font-medium">No, I need to create one</p>
                  <p className="text-xs text-muted-foreground">We&apos;ll help you get started</p>
                </div>
              </OptionTile>
            </div>
            {hasIQ === "no" && (
              <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="mb-3 text-xs font-medium text-primary">Create your free IQ Option account</p>
                <a
                  href={IQ_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/[0.08]"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary" />
                  Sign up on IQ Option
                </a>
                <div className="mt-2.5 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Bonus code</p>
                    <p className="font-mono text-sm font-bold tracking-widest">{BONUS_CODE}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(BONUS_CODE); toast.success("Bonus code copied!"); }}
                    className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {surveyStep === 4 && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-glow">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">Question 3 of 4</p>
            <h3 className="font-display text-xl font-semibold tracking-tight">What&apos;s your trading experience?</h3>
            <p className="mb-5 mt-1 text-sm text-muted-foreground">Be honest — there&apos;s no wrong answer.</p>
            <div className="flex flex-col gap-2.5">
              {LEVELS.map(({ value, emoji, label, desc }) => (
                <OptionTile key={value} selected={level === value} onClick={() => setLevel(value)}>
                  <span className="text-2xl leading-none">{emoji}</span>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </OptionTile>
              ))}
            </div>
          </div>
        )}

        {surveyStep === 5 && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-glow">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">Question 4 of 4</p>
            <h3 className="font-display text-xl font-semibold tracking-tight">How will you use NOJAI?</h3>
            <p className="mb-5 mt-1 text-sm text-muted-foreground">Helps us optimise your bot settings.</p>
            <div className="flex flex-col gap-2.5">
              {USAGE_OPTIONS.map(({ value, emoji, label, desc }) => (
                <OptionTile key={value} selected={usage === value} onClick={() => setUsage(value)}>
                  <span className="text-2xl leading-none">{emoji}</span>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </OptionTile>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Button
          className="w-full gap-2"
          onClick={handleContinue}
          disabled={!canContinue() || isNavigating}
        >
          {isNavigating ? "Taking you in…" : surveyStep === TOTAL_STEPS ? (
            <><span>Finish Setup</span><Sparkles className="h-4 w-4" /></>
          ) : (
            <><span>{surveyStep === 1 ? "Let’s Go" : "Continue"}</span><ChevronRight className="h-4 w-4" /></>
          )}
        </Button>
        <button
          type="button"
          onClick={skipOnboarding}
          disabled={isNavigating}
          className="py-1.5 text-center text-xs text-muted-foreground/50 transition-colors hover:text-muted-foreground"
        >
          Skip and go to dashboard
        </button>
      </div>
    </div>
  );
}
