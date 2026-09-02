import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gift,
  LineChart,
  Lock,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

import { OlympSiteHeader } from "@/components/marketing/olymp-site-header";
import { OlympSiteFooter } from "@/components/marketing/olymp-site-footer";
import { OlympPerformanceChart } from "@/components/marketing/olymp-performance-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { publicGet } from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "NOJAI for Olymp Trade — Free Automated Trading Bot",
  description:
    "Register on Olymp Trade through NOJAI's partner link, deposit, and get free 24/7 automated trading — no subscription required.",
  alternates: { canonical: "https://olymp.nojai.io" },
  openGraph: {
    title: "NOJAI for Olymp Trade — Free Automated Trading Bot",
    description:
      "Register on Olymp Trade through NOJAI's partner link, deposit, and get free 24/7 automated trading — no subscription required.",
    url: "https://olymp.nojai.io",
    images: [{ url: "/autobot-assets/olymptrade.jpeg", width: 1200, height: 630, alt: "NOJAI for Olymp Trade" }],
  },
};

interface OlympFreeSettings {
  affiliateLink: string;
  minDeposit: number;
  bonusCode: string;
}

const FALLBACK_SETTINGS: OlympFreeSettings = {
  affiliateLink: "https://olymp.gl/4Ob6l",
  minDeposit: 10,
  bonusCode: "NOJAI",
};

const steps = [
  {
    icon: ExternalLink,
    title: "Register on Olymp Trade",
    copy: "Create your account using the NOJAI partner link below and enter the bonus code at signup.",
  },
  {
    icon: Wallet,
    title: "Make your deposit",
    copy: "Fund your new Olymp Trade account. Your money stays with Olymp Trade — NOJAI never touches your deposit.",
  },
  {
    icon: ShieldCheck,
    title: "Submit for free access",
    copy: "Log in to NOJAI, open your dashboard, and send your Olymp email, account ID, and deposit amount for a quick manual review.",
  },
  {
    icon: Sparkles,
    title: "Bot trades for you",
    copy: "Once approved, connect your account and NOJAI executes signals on it automatically — no subscription needed for this tier.",
  },
];

const features = [
  {
    icon: Clock,
    title: "24/7 execution",
    copy: "The bot watches the market and places trades around the clock, so you never miss a signal.",
  },
  {
    icon: LineChart,
    title: "Live dashboard",
    copy: "Track balance, open positions, and full trade history in real time from your own Olymp dashboard.",
  },
  {
    icon: Gift,
    title: "Free tier, no card",
    copy: "This isn't a trial — Olymp Trade access on NOJAI is free once your account is approved.",
  },
  {
    icon: Lock,
    title: "You stay in control",
    copy: "Turn automated trading on or off, adjust your trade size, and disconnect your account at any time.",
  },
];

const faqs = [
  {
    question: "Is this actually free?",
    answer:
      "Yes. Olymp Trade automation on NOJAI is a free tier — once your submission is approved, there's no subscription or fee to connect and run the bot on your Olymp Trade account.",
  },
  {
    question: "Do I need a paid NOJAI plan?",
    answer:
      "No. You do need a free NOJAI account (to log in and submit your details), but Olymp Trade access itself doesn't require a paid subscription.",
  },
  {
    question: "Does NOJAI ever hold or touch my money?",
    answer:
      "No. Your funds stay with Olymp Trade at all times. NOJAI connects to your account through Olymp Trade's own systems to place trades on your behalf — it never has access to withdraw or move your deposit.",
  },
  {
    question: "How long does approval take?",
    answer:
      "Submissions are reviewed manually, so it's not instant, but most requests are reviewed quickly. You'll get an email as soon as a decision is made.",
  },
  {
    question: "What if I already have an Olymp Trade account?",
    answer:
      "You can still submit it for review — registering through the NOJAI partner link and bonus code is what qualifies an account, so a pre-existing account may need to be a fresh one registered via the link above.",
  },
  {
    question: "Can I stop the bot or disconnect my account?",
    answer:
      "Yes, at any time from your dashboard — you can pause automated trading or fully disconnect your account with one click.",
  },
];

export default async function OlympSitePage() {
  const settings = await publicGet<OlympFreeSettings>("/olymp-free-settings").catch(() => FALLBACK_SETTINGS);

  return (
    <div className="relative flex min-h-screen flex-col">
      <OlympSiteHeader />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/70 to-transparent" />
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-20">
            <div>
              <Badge className="bg-blue-500/15 text-blue-300">Free tier · No subscription</Badge>
              <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
                Automated Olymp Trade, free — run by NOJAI.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                Register on Olymp Trade through the NOJAI partner link, deposit, and submit your details for
                a quick review. Once approved, NOJAI trades your Olymp Trade account automatically — 24/7,
                no subscription required.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-emerald-600 text-white hover:bg-emerald-500">
                  <Link href={settings.affiliateLink} target="_blank" rel="noreferrer">
                    Register on Olymp Trade
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/auth/register">
                    Get free access
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Free once approved</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Your funds stay on Olymp Trade</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Disconnect anytime</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-blue-500/20 bg-blue-500/[0.04]">
              <div className="relative h-40 w-full sm:h-48">
                <Image
                  src="/autobot-assets/olymptrade.jpeg"
                  alt="Olymp Trade"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f16] via-[#0a0f16]/10 to-transparent" />
              </div>
              <div className="flex flex-col gap-4 p-6 sm:p-8">
                <Button asChild size="lg" className="h-auto w-full flex-col gap-1 rounded-2xl bg-emerald-600 py-4 text-white hover:bg-emerald-500">
                  <Link href={settings.affiliateLink} target="_blank" rel="noreferrer">
                    <span className="flex items-center gap-2 text-base font-bold">
                      Join Olymp Trade today
                      <ExternalLink className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-normal text-white/80">Use the NOJAI partner link — takes under a minute</span>
                  </Link>
                </Button>

                <div className="rounded-2xl border border-blue-500/25 bg-black/20 p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
                      <Gift className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Bonus code</p>
                      <p className="mt-1 font-display text-3xl font-black text-blue-300">{settings.bonusCode}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Live performance ── */}
        <section className="mx-auto max-w-7xl px-6 pb-16 lg:px-8">
          <OlympPerformanceChart />
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="mx-auto max-w-7xl px-6 pb-6 pt-4 lg:px-8">
          <div className="max-w-2xl">
            <Badge variant="outline">How it works</Badge>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Four steps to a free automated account</h2>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={step.title} className="h-full rounded-[1.25rem] border-blue-500/15 bg-white/[0.03]">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="font-display text-2xl font-bold text-blue-500/30">0{index + 1}</span>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.copy}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* ── Why NOJAI ── */}
        <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="max-w-2xl">
            <Badge variant="outline">Why run it through NOJAI</Badge>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Built for hands-off trading</h2>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.copy}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
          <div className="max-w-2xl">
            <Badge variant="outline">FAQ</Badge>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Common questions</h2>
          </div>
          <Card className="mt-8">
            <CardContent className="p-6">
              <Accordion type="single" collapsible>
                {faqs.map((item) => (
                  <AccordionItem key={item.question} value={item.question}>
                    <AccordionTrigger>{item.question}</AccordionTrigger>
                    <AccordionContent>{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </section>

        {/* ── Final CTA ── */}
        <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
          <div className="rounded-[1.5rem] border border-blue-500/20 bg-blue-500/[0.05] p-6 sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-300">Ready when you are</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Register on Olymp Trade, deposit, then create a free NOJAI account to submit your details for approval.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link href={settings.affiliateLink} target="_blank" rel="noreferrer">
                    Register on Olymp
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-500">
                  <Link href="/auth/register">
                    Create NOJAI account
                    <CheckCircle2 className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <OlympSiteFooter />
    </div>
  );
}
