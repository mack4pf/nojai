import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Gift,
  LineChart,
  Lock,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";

import { OlympSiteHeader } from "@/components/marketing/olymp-site-header";
import { OlympSiteFooter } from "@/components/marketing/olymp-site-footer";
import { OlympPerformanceChart } from "@/components/marketing/olymp-performance-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getPublicReviews, publicGet } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "NOJAI for Olymp Trade — Free Automated Trading Bot",
  description:
    "Open your Olymp Trade account in one click from NOJAI, deposit, and get free 24/7 automated trading — no subscription required.",
  alternates: { canonical: "https://olymp.nojai.io" },
  openGraph: {
    title: "NOJAI for Olymp Trade — Free Automated Trading Bot",
    description:
      "Open your Olymp Trade account in one click from NOJAI, deposit, and get free 24/7 automated trading — no subscription required.",
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
    icon: ArrowRight,
    title: "Create your free NOJAI account",
    copy: "Email and password, under a minute. No card, no subscription.",
  },
  {
    icon: Sparkles,
    title: "We open your Olymp Trade account",
    copy: "One click from your dashboard. No forms to fill, and no Olymp password to remember — we handle the whole registration for you.",
  },
  {
    icon: Wallet,
    title: "Make your deposit",
    copy: "Fund it straight from your dashboard, already logged in. Your money goes into your own Olymp Trade account — NOJAI never touches it.",
  },
  {
    icon: ShieldCheck,
    title: "The bot trades for you",
    copy: "NOJAI executes signals on your account automatically, 24/7. Free — no monthly subscription on this tier.",
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
      "The one-click setup opens a brand new account for you, so it can't be used if you already have an Olymp Trade account on the same email. You can either sign up for NOJAI with a different email address, or connect your existing account manually from the main NOJAI dashboard.",
  },
  {
    question: "Do I need an Olymp Trade password?",
    answer:
      "No. We create and manage the account for you, and your dashboard has buttons that log you straight into Olymp Trade — to deposit or to view your trades. You never type an Olymp password, and NOJAI never stores one.",
  },
  {
    question: "Can I stop the bot or disconnect my account?",
    answer:
      "Yes, at any time from your dashboard — you can pause automated trading or fully disconnect your account with one click.",
  },
];

export default async function OlympSitePage() {
  const [settings, reviews] = await Promise.all([
    publicGet<OlympFreeSettings>("/olymp-free-settings").catch(() => FALLBACK_SETTINGS),
    getPublicReviews().catch(() => []),
  ]);
  const topReviews = reviews.slice(0, 3);

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
                Automated Olymp Trade bot — no monthly fee.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                Create your Olymp Trade account in one click, right from NOJAI — no forms, no Olymp password.
                Deposit into your own account, and the bot trades it for you. No monthly subscription.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-emerald-600 text-white hover:bg-emerald-500">
                  <Link href="/auth/register">
                    Get started free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/#how-it-works">
                    See how it works
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
                  <Link href="/auth/register">
                    <span className="flex items-center gap-2 text-base font-bold">
                      Join Olymp Trade today
                      <ArrowRight className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-normal text-white/80">We open your account for you — takes under a minute</span>
                  </Link>
                </Button>

                <div className="rounded-2xl border border-blue-500/25 bg-black/20 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    What you get
                  </p>
                  <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2.5">
                      <Gift className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                      <span>Account opened for you — no forms, no Olymp password</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                      <span>Your deposit stays in your own Olymp account</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                      <span>Bot trades 24/7 — cancel or pause anytime</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Live performance ── */}
        <section className="mx-auto max-w-7xl px-6 pb-16 lg:px-8">
          <OlympPerformanceChart />
        </section>

        {/* ── Reviews ── */}
        {topReviews.length > 0 ? (
          <section className="mx-auto max-w-7xl px-6 pb-16 lg:px-8">
            <div className="max-w-2xl">
              <Badge variant="outline">Reviews</Badge>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">What NOJAI traders are saying</h2>
            </div>
            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {topReviews.map((review) => (
                <Card key={review._id} className="rounded-[1.25rem] border-white/10 bg-white/[0.03]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{review.userName ?? "Verified user"}</CardTitle>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted-foreground/30"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <CardDescription>{formatDate(review.createdAt)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-muted-foreground">{review.comment}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

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
                  Create a free NOJAI account and we&apos;ll open your Olymp Trade account for you. Deposit, and
                  the bot starts trading — no subscription.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-500">
                  <Link href="/auth/register">
                    Get started free
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
