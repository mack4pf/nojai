"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, CheckCircle2, ChevronLeft, ExternalLink, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const STORAGE_KEY = "nojai_onboarding_done";

type Source = "telegram" | "youtube" | "google" | "tiktok" | "ai" | "other";
type Level  = "beginner" | "intermediate" | "expert";
type Usage  = "full_auto" | "alongside" | "other";

// â”€â”€ Inline brand SVG logos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TelegramLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="120" cy="120" r="120" fill="url(#tg-g)" />
      <defs>
        <linearGradient id="tg-g" x1="120" y1="0" x2="120" y2="240" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2AABEE" /><stop offset="1" stopColor="#229ED9" />
        </linearGradient>
      </defs>
      <path d="M176 68 153 177s-3 8-12 4l-43-33-15-7-27-9s-4-1-4-5 5-6 5-6l109-42s10-4 10-1z" fill="white" fillOpacity=".95" />
      <path d="M99 148l-3 25s-1 8 7 0l19-17-23-8z" fill="white" fillOpacity=".7" />
      <path d="M141 180l-27-21 39-23" fill="white" fillOpacity=".45" />
    </svg>
  );
}

function YouTubeLogo({ size = 36 }: { size?: number }) {
  const w = size * 1.42;
  return (
    <svg width={w} height={size} viewBox="0 0 90 63" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="90" height="63" rx="14" fill="#FF0000" />
      <path d="M37 44V19l24 12.5L37 44z" fill="white" />
    </svg>
  );
}

function GoogleLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M47.5 24.6c0-1.6-.1-3.2-.4-4.7H24v8.9h13.2a11.3 11.3 0 0 1-4.9 7.4v6.1h7.9C44.7 38 47.5 31.9 47.5 24.6z" fill="#4285F4" />
      <path d="M24 48c6.6 0 12.1-2.2 16.2-5.9l-7.9-6.1c-2.2 1.5-5 2.3-8.3 2.3-6.4 0-11.8-4.3-13.7-10.1H2.1v6.3A24 24 0 0 0 24 48z" fill="#34A853" />
      <path d="M10.3 28.2A14.4 14.4 0 0 1 9.5 24c0-1.5.3-2.9.8-4.2v-6.3H2.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.1 10.5l8.2-6.3z" fill="#FBBC05" />
      <path d="M24 9.5c3.6 0 6.8 1.2 9.4 3.7l7-7C36 2.2 30.5 0 24 0A24 24 0 0 0 2.1 13.5l8.2 6.3C12.2 13.8 17.6 9.5 24 9.5z" fill="#EA4335" />
    </svg>
  );
}

function TikTokLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#010101" />
      <path d="M34.5 10.3a9 9 0 0 1-9-9h-5v28.3a5.3 5.3 0 1 1-5.3-5.3c.5 0 1 .1 1.5.2v-5.2a10.5 10.5 0 1 0 8.8 10.3V19.7a14.5 14.5 0 0 0 9 3.1v-5a9 9 0 0 1-5-1.5v-6z" fill="none" />
      <path d="M31 9a7.5 7.5 0 0 0 7.5 7.5v-4a3.5 3.5 0 0 1-3.5-3.5H31z" fill="#EE1D52" />
      <path d="M38.5 16.5V21A12 12 0 0 1 31 18v11.8a10.5 10.5 0 1 1-10.5-10.5c.5 0 1 0 1.5.1v4.9a5.5 5.5 0 1 0 5.5 5.5V9h4a7.5 7.5 0 0 0 7.5 7.5z" fill="white" />
      <path d="M31 9a7.5 7.5 0 0 0 7.5 7.5v-4a3.5 3.5 0 0 1-3.5-3.5H31z" fill="#EE1D52" />
      <path d="M38.5 12.5v4A12 12 0 0 1 31 13V9h-4v29.8A7.5 7.5 0 1 1 20 31.3v-4.9a12 12 0 1 0 11 11.4V18.1a14.5 14.5 0 0 0 9 3v-5a7.5 7.5 0 0 1-1.5-3.6z" fill="#69C9D0" />
    </svg>
  );
}

function OpenAILogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="41" height="41" rx="8" fill="#0d0d0d" />
      <path d="M33.2 17.2a8.1 8.1 0 0 0-.7-6.6 8.2 8.2 0 0 0-8.8-3.9A8.2 8.2 0 0 0 17.5 4a8.2 8.2 0 0 0-7.8 5.7 8.2 8.2 0 0 0-5.5 4 8.2 8.2 0 0 0 1 9.6 8.2 8.2 0 0 0 .7 6.6 8.2 8.2 0 0 0 8.8 3.9 8.2 8.2 0 0 0 6.2 2.7 8.2 8.2 0 0 0 7.8-5.7 8.2 8.2 0 0 0 5.5-4 8.2 8.2 0 0 0-1-9.6zm-12 16.8a6 6 0 0 1-3.9-1.4l.2-.1 6.5-3.8a1 1 0 0 0 .5-.9v-9.2l2.8 1.6v7.7a6 6 0 0 1-6.1 4.1zM7.5 29.6a6 6 0 0 1-.7-4.1l.2.1 6.5 3.8a1 1 0 0 0 1 0L22.5 25v3.1l-8 4.6a6 6 0 0 1-7-3.1zM6.2 15.1a6 6 0 0 1 3.2-2.7v7.8a1 1 0 0 0 .5.9l8 4.6-2.8 1.6-6.5-3.8a6 6 0 0 1-2.4-8.4zm22.7 5.2-8-4.6 2.8-1.6 6.5 3.8a6 6 0 0 1-.9 11.1v-7.8a1 1 0 0 0-.4-.9zm2.7-4.1-.2-.1-6.5-3.8a1 1 0 0 0-1 0L16 16.8v-3.1l8-4.6a6 6 0 0 1 7.6 7.2zm-17.2 5.7-2.8-1.6V13a6 6 0 0 1 9.8-4.6l-.2.1-6.5 3.8a1 1 0 0 0-.5.9l.2 9.7z" fill="white" fillOpacity=".9" />
    </svg>
  );
}

function OtherLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#1e1e2e" />
      <circle cx="13" cy="20" r="2.5" fill="white" fillOpacity=".55" />
      <circle cx="20" cy="20" r="2.5" fill="white" fillOpacity=".55" />
      <circle cx="27" cy="20" r="2.5" fill="white" fillOpacity=".55" />
    </svg>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SOURCES: { value: Source; label: string; sublabel: string; Logo: React.ComponentType<{ size?: number }> }[] = [
  { value: "telegram", label: "Telegram",      sublabel: "Channel or group",   Logo: TelegramLogo },
  { value: "youtube",  label: "YouTube",       sublabel: "Video or ad",        Logo: YouTubeLogo },
  { value: "google",   label: "Google",        sublabel: "Search or ad",       Logo: GoogleLogo },
  { value: "tiktok",   label: "TikTok",        sublabel: "Video or ad",        Logo: TikTokLogo },
  { value: "ai",       label: "ChatGPT / AI",  sublabel: "AI recommendation",  Logo: OpenAILogo },
  { value: "other",    label: "Other",         sublabel: "Word of mouth etc",  Logo: OtherLogo },
];

const LEVELS: { value: Level; label: string; desc: string }[] = [
  { value: "beginner",     label: "Beginner",     desc: "New to trading or just getting started." },
  { value: "intermediate", label: "Intermediate", desc: "I've traded before and know the basics." },
  { value: "expert",       label: "Expert",       desc: "I trade regularly and know strategies well." },
];

const USAGE_OPTIONS: { value: Usage; label: string; desc: string }[] = [
  { value: "full_auto", label: "Full Automation",  desc: "Let the bot handle all trades for me." },
  { value: "alongside", label: "Trade Alongside",  desc: "I'll also place my own trades manually." },
  { value: "other",     label: "Still Deciding",   desc: "I'll figure it out as I go." },
];

const IQ_LINK    = "https://affiliate.iqoption.net/redir/?aff=785369&aff_model=revenue&afftrack=";
const YT_HOW_TO  = "zvIj5Jy6_w4";
const YT_REG     = "eLSVqI8_AgI";
const YT_BOT     = "tePDDjJnMuM";
const BONUS_CODE = "Niels100";
const TOTAL_STEPS = 5;

export function OnboardingPopup() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [open, setOpen]           = useState(false);
  const [step, setStep]           = useState(0);
  const [source, setSource]       = useState<Source | null>(null);
  const [hasIQ, setHasIQ]         = useState<boolean | null>(null);
  const [level, setLevel]         = useState<Level | null>(null);
  const [usage, setUsage]         = useState<Usage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitted = useRef(false);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isWelcome = searchParams?.get("welcome") === "1";

    if (isWelcome) {
      // User JUST registered — always show, ignore localStorage (they can't have completed it yet).
      timerRef.current = setTimeout(() => setOpen(true), 400);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }

    // Returning visitor: check localStorage first.
    try { if (localStorage.getItem(STORAGE_KEY)) return; } catch { /* ignore */ }

    // Returning visitor: check server to handle new devices / cleared storage.
    let cancelled = false;
    async function checkServer() {
      try {
        const res = await api.get("/user/onboarding-survey");
        const d = res.data;
        if (d?.completed === true || d?.referralSource != null || d?.completedAt != null) {
          try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
          return;
        }
      } catch { /* not completed â€” fall through */ }
      if (!cancelled) timerRef.current = setTimeout(() => { if (!cancelled) setOpen(true); }, 900);
    }
    checkServer();
    return () => { cancelled = true; if (timerRef.current) clearTimeout(timerRef.current); };
  }, [searchParams]);

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setOpen(false);
    // Strip ?welcome=1 and ?plan from URL cleanly.
    if (searchParams?.get("welcome") === "1") {
      const url = new URL(window.location.href);
      url.searchParams.delete("welcome");
      url.searchParams.delete("plan");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }

  async function submitSurvey() {
    if (submitted.current) return;
    submitted.current = true;
    setSubmitting(true);
    try {
      await api.post("/user/onboarding-survey", {
        referralSource: source ?? "other",
        hasIQAccount: hasIQ ?? false,
        tradingLevel: level ?? "beginner",
        botUsage: usage ?? "full_auto",
        completedAt: new Date().toISOString(),
      });
    } catch { /* silently continue */ }
    finally { setSubmitting(false); dismiss(); }
  }

  function next() { setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }
  function handleHasIQ(val: boolean) { setHasIQ(val); setStep(val ? 3 : 2); }

  const progress = Math.round(((step + 1) / TOTAL_STEPS) * 100);

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#08080f] shadow-[0_32px_80px_rgba(0,0,0,0.75)] focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          style={{ maxHeight: "92vh", overflowY: "auto" }}
        >
          {/* Progress bar */}
          <div className="h-[3px] w-full bg-white/[0.06]">
            <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>

          {/* Close button */}
          <button
            onClick={dismiss}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white/70"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="p-7">
            {/* Step indicator dots */}
            <div className="mb-7 flex items-center gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-[3px] rounded-full transition-all duration-300 ${
                    i === step ? "w-7 bg-primary" : i < step ? "w-3 bg-primary/40" : "w-3 bg-white/[0.08]"
                  }`}
                />
              ))}
            </div>

            {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Step 0: Welcome â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {step === 0 && (
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.08] px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-[11px] font-semibold tracking-wide text-primary">Account created</span>
                </div>

                <h2 className="font-display text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl">
                  Welcome to NOJAI.<br />
                  Let&apos;s set up your experience.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/45">
                  Answer 4 quick questions so we can personalise how the bot works for you. Takes about 30 seconds.
                </p>

                {/* Stacked photo card */}
                <div className="relative mx-auto mt-8 h-44 w-64 sm:h-52 sm:w-72">
                  <div className="absolute inset-0 rotate-[-4deg] scale-[0.93] rounded-[1.5rem] bg-primary/70" />
                  <div className="absolute inset-0 rotate-[2deg] scale-[0.97] rounded-[1.5rem] bg-white/[0.04]" />
                  <div className="relative h-full w-full overflow-hidden rounded-[1.5rem] border border-white/[0.1]">
                    <Image
                      src="/autobot-assets/iqoptionplusai.jpg"
                      alt="NOJAI AI Bot"
                      fill
                      className="object-cover"
                      priority
                    />
                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/70 to-transparent" />
                    <p className="absolute bottom-3 left-0 right-0 text-center text-[11px] font-semibold tracking-wide text-white/80">
                      IQ Option + NOJAI AI
                    </p>
                  </div>
                </div>

                <Button className="mt-8 w-full gap-2 font-semibold" size="lg" onClick={next}>
                  Get started <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Step 1: Source â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {step === 1 && (
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Where did you hear about NOJAI?
                </h2>
                <p className="mt-1.5 text-sm text-white/45">Pick the one that applies most.</p>

                <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {SOURCES.map(({ value, label, sublabel, Logo }) => {
                    const selected = source === value;
                    return (
                      <button
                        key={value}
                        onClick={() => setSource(value)}
                        className={`group relative flex flex-col items-center gap-3 rounded-2xl border px-3 py-4 text-center transition-all duration-200 ${
                          selected
                            ? "border-primary/50 bg-primary/[0.08]"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                        }`}
                      >
                        <Logo size={36} />
                        <div>
                          <p className="text-xs font-bold leading-tight text-white">{label}</p>
                          <p className="mt-0.5 text-[10px] text-white/35">{sublabel}</p>
                        </div>
                        {selected && (
                          <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                            <CheckCircle2 className="h-3 w-3 text-black" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex gap-2.5">
                  <Button variant="outline" size="sm" onClick={back} className="px-3">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button className="flex-1 gap-2 font-semibold" disabled={!source} onClick={next}>
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Step 2: Broker check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {step === 2 && (
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Do you have a supported broker account?
                </h2>
                <p className="mt-1.5 text-sm text-white/45">
                  NOJAI connects to IQ Option, Expert Option, or any MT5 broker to execute trades automatically.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[
                    { val: true,  label: "Yes, I'm ready",      sub: "I have a broker account",      dot: "bg-emerald-400", border: "border-emerald-500/40 bg-emerald-500/[0.07]" },
                    { val: false, label: "Not yet",        sub: "I need to open one", dot: "bg-amber-400",  border: "border-amber-500/40 bg-amber-500/[0.07]" },
                  ].map(({ val, label, sub, dot, border }) => (
                    <button
                      key={String(val)}
                      onClick={() => handleHasIQ(val)}
                      className={`flex flex-col items-start gap-2.5 rounded-2xl border p-5 text-left transition-all duration-200 ${
                        hasIQ === val ? border : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                      <p className="text-sm font-bold text-white">{label}</p>
                      <p className="text-[11px] text-white/40">{sub}</p>
                    </button>
                  ))}
                </div>

                {hasIQ === false && (
                  <div className="mt-6 space-y-5">
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
                      <p className="text-sm font-semibold text-amber-300">Register with our link and get a bonus.</p>
                      <p className="mt-1 text-xs text-white/45">
                        Use code <span className="font-bold text-white">{BONUS_CODE}</span> for a 120% deposit bonus.
                      </p>
                      <a
                        href={IQ_LINK}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#FF7803] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
                      >
                        Open IQ Option account <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>

                    <p className="text-[11px] font-semibold uppercase tracking-widest text-white/25">Step-by-step tutorials</p>

                    <div className="space-y-3">
                      {[
                        { id: YT_HOW_TO, title: "How to trade on IQ Option" },
                        { id: YT_REG,    title: "Register & deposit with bonus code" },
                        { id: YT_BOT,    title: "NOJAI bot setup guide" },
                      ].map((vid) => (
                        <div key={vid.id} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.01]">
                          <p className="px-4 py-2.5 text-xs font-semibold text-white/60">{vid.title}</p>
                          <div className="aspect-video">
                            <iframe
                              src={`https://www.youtube-nocookie.com/embed/${vid.id}`}
                              title={vid.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="h-full w-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button className="w-full gap-2 font-semibold" onClick={() => setStep(3)}>
                      I&apos;ve registered â€” continue <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {hasIQ === null && (
                  <div className="mt-6">
                    <Button variant="outline" size="sm" onClick={back} className="px-3">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Step 3: Trading experience â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {step === 3 && (
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
                  What&apos;s your trading experience?
                </h2>
                <p className="mt-1.5 text-sm text-white/45">We&apos;ll use this to tailor your bot settings.</p>

                <div className="mt-6 space-y-2.5">
                  {LEVELS.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => setLevel(l.value)}
                      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
                        level === l.value
                          ? "border-primary/50 bg-primary/[0.08]"
                          : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className={`h-4 w-4 shrink-0 rounded-full border-2 transition-all ${
                        level === l.value ? "border-primary bg-primary" : "border-white/20"
                      }`} />
                      <div>
                        <p className="text-sm font-bold text-white">{l.label}</p>
                        <p className="mt-0.5 text-xs text-white/40">{l.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex gap-2.5">
                  <Button variant="outline" size="sm" onClick={back} className="px-3">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button className="flex-1 gap-2 font-semibold" disabled={!level} onClick={next}>
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Step 4: Bot usage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {step === 4 && (
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
                  How do you plan to use the bot?
                </h2>
                <p className="mt-1.5 text-sm text-white/45">Helps us optimise your default configuration.</p>

                <div className="mt-6 space-y-2.5">
                  {USAGE_OPTIONS.map((u) => (
                    <button
                      key={u.value}
                      onClick={() => setUsage(u.value)}
                      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
                        usage === u.value
                          ? "border-primary/50 bg-primary/[0.08]"
                          : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className={`h-4 w-4 shrink-0 rounded-full border-2 transition-all ${
                        usage === u.value ? "border-primary bg-primary" : "border-white/20"
                      }`} />
                      <div>
                        <p className="text-sm font-bold text-white">{u.label}</p>
                        <p className="mt-0.5 text-xs text-white/40">{u.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-7 flex gap-2.5">
                  <Button variant="outline" size="sm" onClick={back} className="px-3">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    className="flex-1 gap-2 font-semibold"
                    size="lg"
                    disabled={!usage || submitting}
                    onClick={submitSurvey}
                  >
                    {submitting ? "Savingâ€¦" : "Done â€” go to dashboard"}
                    {!submitting && <CheckCircle2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
