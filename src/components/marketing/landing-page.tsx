import Link from "next/link";
import Image from "next/image";

import { ArrowRight, CheckCircle2, ChevronRight, Crown, Sparkles, Zap } from "lucide-react";

import { MarketingShell } from "@/components/layout/marketing-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VideoResources } from "@/components/marketing/video-resources";
import { academyLink, faqItems, featureList, publicPricingPlans } from "@/lib/marketing";
import { formatCurrency, formatDate, normalizeCurrencyCode } from "@/lib/utils";
import type { PricingPlan, Review } from "@/types";

const brokerData: Array<{
  name: string;
  logo: string;
  logoWidth: number;
  logoHeight: number;
  status: "live" | "soon";
  color: string;
  bg: string;
  description: string;
}> = [
  {
    name: "IQ Option",
    logo: "/autobot-assets/iq-option.svg",
    logoWidth: 160,
    logoHeight: 40,
    status: "live",
    color: "#FF7803",
    bg: "#1a0a00",
    description: "Connect your IQ Option account and start bot automation today.",
  },
  {
    name: "Pocket Option",
    logo: "/autobot-assets/pocket-option.svg",
    logoWidth: 180,
    logoHeight: 40,
    status: "soon",
    color: "#0099FA",
    bg: "#00091a",
    description: "Pocket Option integration is in active development.",
  },
  {
    name: "Expert Option",
    logo: "/autobot-assets/expert-option-real.svg",
    logoWidth: 180,
    logoHeight: 44,
    status: "soon",
    color: "#1565C0",
    bg: "#010a1a",
    description: "Expert Option support is queued for the next release.",
  },
  {
    name: "Crypto Trading",
    logo: "/autobot-assets/crypto-trading.svg",
    logoWidth: 160,
    logoHeight: 40,
    status: "soon",
    color: "#F7931A",
    bg: "#0f0700",
    description: "BTC, ETH, and altcoin automation is on the roadmap.",
  },
  {
    name: "Stock & Forex",
    logo: "/autobot-assets/stock-forex.svg",
    logoWidth: 160,
    logoHeight: 40,
    status: "soon",
    color: "#0F62FE",
    bg: "#00030f",
    description: "Stock and forex broker connections are planned next.",
  },
  {
    name: "MT5",
    logo: "/autobot-assets/metatrader.svg",
    logoWidth: 160,
    logoHeight: 40,
    status: "soon",
    color: "#1565C0",
    bg: "#00030f",
    description: "MetaTrader 5 support is also coming soon.",
  },
];

const planConfig = {
  STANDARD: {
    compareAt: 60,
    headerBg: "#0c1a2e",
    accentColor: "#38bdf8",
    icon: Zap,
    summary: "Simple bot access for new users.",
  },
  PRO: {
    compareAt: 100,
    headerBg: "#0f0c1f",
    accentColor: "#a78bfa",
    icon: Sparkles,
    summary: "Bot access with copy trading.",
  },
  VIP: {
    compareAt: 150,
    headerBg: "#0d1a0d",
    accentColor: "#34d399",
    icon: Crown,
    summary: "TradingView strategy and multi-account access.",
  },
} as const;

interface LandingPageProps {
  pricingPlans?: PricingPlan[];
  reviews: Review[];
}

export function LandingPage({ pricingPlans, reviews }: LandingPageProps) {
  const plansToShow = pricingPlans?.length ? pricingPlans : publicPricingPlans;

  const getPlanCurrency = (currency?: string | null) => normalizeCurrencyCode(currency) ?? "USD";

  const pricingSummary = plansToShow
    .slice(0, 3)
    .map((plan) => {
      const currency = getPlanCurrency(plan.currency);
      return `${plan.name} ${formatCurrency(plan.price, currency)} ${currency}`;
    })
    .join(", ");

  return (
    <MarketingShell>
      <section className="surface-grid relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-24">
          <div className="animate-fade-up">
            <Badge>Automate & Trade</Badge>
            <h1 className="mt-6 max-w-3xl font-display text-5xl font-semibold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              Automated Trading Robot for beginners.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Start making money online with NOJAI. Connect your broker, set your amount, and let the bot trade for you 24/7.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2">Get started simple</span>
              <Image src="/autobot-assets/iq-option-small.svg" alt="IQ Option" width={32} height={32} className="h-8 w-auto" />
              <Image src="/autobot-assets/tradingview.svg" alt="TradingView" width={120} height={28} className="h-6 w-auto opacity-90" />
              <Image src="/autobot-assets/metatrader.svg" alt="MetaTrader" width={120} height={28} className="h-6 w-auto opacity-90" />
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild size="lg">
                <Link href="/auth/register">
                  Start now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/about">How it works</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-col gap-3 items-start sm:flex-row sm:items-center">
              <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-5 py-2 text-sm font-medium text-primary">
                Registration is free. Current plan pricing: {pricingSummary}.
              </div>
              <div className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-5 py-2 text-sm font-medium text-green-500">
                <Sparkles className="mr-2 h-4 w-4" /> Start making up to $500 monthly with NOJAI Affiliate program
              </div>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ["24/7", "Automated trading coverage"],
                ["3 plans", "Clear bot subscription levels"],
                ["Free", "Academy access to learn more"],
              ].map(([value, label]) => (
                <Card key={label} className="bg-white/5">
                  <CardContent className="p-5">
                    <p className="font-display text-2xl font-semibold">{value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-white/10 to-white/5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,188,78,0.18),transparent_34%)]" />
            <CardHeader className="relative pb-0">
              <Badge variant="secondary" className="w-fit">Dashboard preview</Badge>
              <CardTitle className="mt-4 text-3xl">Simple setup and account view</CardTitle>
              <CardDescription>
                Connect your broker, manage bot settings, and check balances in one place.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative pt-6">
              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 p-3">
                <Image
                  src="/autobot-assets/app-hero.svg"
                  alt="NOJAI trading dashboard preview"
                  width={1200}
                  height={900}
                  className="h-auto w-full rounded-[1.5rem]"
                  priority
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-4 lg:px-8 lg:py-8">
        <Card className="border-primary/25 bg-gradient-to-br from-primary/10 via-transparent to-accent/10">
          <CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
            <div>
              <Badge variant="outline">Academy</Badge>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight">Join our academy for free</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Learn more about the bot, strategy, and trading flow from our academy community.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href={academyLink} target="_blank" rel="noreferrer">
                Join the academy
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
        <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-transparent to-accent/10">
          <CardHeader>
            <Badge variant="outline" className="w-fit">Our Strategy</Badge>
            <CardTitle className="mt-2">Signal sourcing with instant execution</CardTitle>
            <CardDescription className="max-w-3xl text-base leading-7">
              Our strategy sources trades from one of the best charting platforms into NOJAI, and execution is then triggered instantly on your preferred broker.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge variant="outline">Features</Badge>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight">What our platform offers</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            Beginner friendly and easy to use
          </div>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {featureList.map((feature) => (
            <Card key={feature.title} className="h-full">
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section id="brokers" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline">Our Brokers</Badge>
          <h2 className="mt-5 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            One live. Five on the way.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            IQ Option is connected and live right now. Pocket Option, Expert Option, Crypto, Stock &amp; Forex, and MT5 are actively in development.
          </p>
        </div>

        {/* IQ Option hero card */}
        <div
          className="animate-nojai-slide-up mt-12 overflow-hidden rounded-[2rem] border-2 border-[#FF7803]"
          style={{ background: "#0f0800" }}
        >
          <div className="grid items-center gap-0 lg:grid-cols-[1fr_1fr]">
            <div className="border-b border-[#FF7803]/30 p-8 lg:border-b-0 lg:border-r lg:p-12">
              <div className="flex items-center gap-3">
                <span
                  className="animate-nojai-live-dot inline-block h-3 w-3 rounded-full"
                  style={{ background: "#22c55e" }}
                />
                <span className="text-sm font-bold uppercase tracking-[0.3em] text-[#22c55e]">Live now</span>
              </div>
              <div className="mt-6">
                <Image
                  src="/autobot-assets/iq-option.svg"
                  alt="IQ Option"
                  width={180}
                  height={44}
                  className="h-10 w-auto"
                />
              </div>
              <p className="mt-5 text-xl font-semibold text-white">
                The only broker you can connect today.
              </p>
              <p className="mt-3 text-base leading-7" style={{ color: "#a8a8b3" }}>
                Connect your IQ Option account from the dashboard right now and start bot automation in minutes. Real account and practice account are both supported.
              </p>
              <Button asChild className="mt-8" size="lg">
                <Link href="/auth/register">
                  Connect IQ Option
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="p-8 lg:p-12">
              <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: "#FF7803" }}>What you get</p>
              <ul className="mt-6 space-y-5">
                {[
                  ["Real account automation", "Bot trades live on your real IQ Option balance"],
                  ["Practice account support", "Test the bot risk-free on a demo balance first"],
                  ["Live balance sync", "Dashboard shows your real broker balance in real time"],
                  ["Multi-account for VIP", "VIP users can connect up to 3 IQ Option accounts"],
                ].map(([title, desc]) => (
                  <li key={title} className="flex items-start gap-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "#FF7803" }} />
                    <div>
                      <p className="font-semibold text-white">{title}</p>
                      <p className="mt-0.5 text-sm" style={{ color: "#a8a8b3" }}>{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Coming soon grid */}
        <p className="mt-12 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">Coming next</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          {brokerData.filter((b) => b.status === "soon").map((broker, index) => (
            <div
              key={broker.name}
              className="animate-nojai-slide-up group relative overflow-hidden rounded-[1.5rem] border border-white/[0.08] p-6 transition-transform duration-300 hover:-translate-y-1"
              style={{
                background: broker.bg,
                animationDelay: `${(index + 1) * 80}ms`,
              }}
            >
              <div
                className="absolute inset-x-0 top-0 h-px"
                style={{ background: broker.color, opacity: 0.5 }}
              />
              <div className="h-8">
                <Image
                  src={broker.logo}
                  alt={broker.name}
                  width={broker.logoWidth}
                  height={broker.logoHeight}
                  className="h-8 w-auto"
                  unoptimized
                />
              </div>
              <p className="mt-5 text-sm font-semibold text-white">{broker.name}</p>
              <p className="mt-2 text-xs leading-5" style={{ color: "#a8a8b3" }}>{broker.description}</p>
              <div
                className="mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.22em]"
                style={{ background: `${broker.color}18`, color: broker.color }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: broker.color }} />
                Coming soon
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge variant="outline">Pricing</Badge>
            <h2 className="mt-5 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Simple plans. 50% off right now.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Registration is free. Subscribe only when you are ready. Every plan is at launch discount pricing today.
            </p>
          </div>
          <div
            className="animate-nojai-scale-in flex shrink-0 flex-col items-center justify-center rounded-[1.75rem] px-8 py-6 text-center"
            style={{ background: "#0f1a00", border: "2px solid #4ade80" }}
          >
            <p className="text-4xl font-black" style={{ color: "#4ade80" }}>50%</p>
            <p className="mt-1 text-sm font-bold uppercase tracking-[0.22em] text-white">OFF</p>
            <p className="mt-2 text-xs" style={{ color: "#a8a8b3" }}>Launch campaign</p>
          </div>
        </div>

        {/* Plan cards */}
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plansToShow.map((plan, index) => {
            const cfg = planConfig[plan.tier as keyof typeof planConfig] ?? planConfig.PRO;
            const compareAt = cfg.compareAt;
            const Icon = cfg.icon;
            const currency = getPlanCurrency(plan.currency);

            return (
              <div
                key={plan._id}
                className="animate-nojai-slide-up relative flex flex-col overflow-hidden rounded-[2rem] border"
                style={{
                  background: cfg.headerBg,
                  borderColor: plan.isPopular ? cfg.accentColor : "rgba(255,255,255,0.1)",
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* Accent top bar */}
                <div className="h-1.5 w-full" style={{ background: cfg.accentColor }} />

                {plan.isPopular ? (
                  <div
                    className="absolute right-5 top-4 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.22em]"
                    style={{ background: cfg.accentColor, color: "#000" }}
                  >
                    Most chosen
                  </div>
                ) : null}

                <div className="flex flex-1 flex-col p-7">
                  {/* Icon + name */}
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-[0.875rem]"
                      style={{ background: `${cfg.accentColor}22` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: cfg.accentColor }} />
                    </div>
                    <p className="text-lg font-bold text-white">{plan.name}</p>
                  </div>

                  {/* Price */}
                  <div className="mt-7">
                    <div className="flex items-end gap-3">
                      <p className="font-display text-6xl font-black text-white">
                        {formatCurrency(plan.price, currency)}
                      </p>
                      <span className="pb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/70">{currency}</span>
                      <div className="pb-2">
                        <p className="text-2xl font-semibold text-white/30 line-through">{formatCurrency(compareAt, currency)}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm" style={{ color: "#a8a8b3" }}>
                      Every {plan.durationInDays} days · You save {formatCurrency(compareAt - plan.price, currency)}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="my-6 h-px w-full" style={{ background: "rgba(255,255,255,0.07)" }} />

                  <p className="mb-5 text-sm" style={{ color: "#a8a8b3" }}>{cfg.summary}</p>

                  {/* Features */}
                  <ul className="flex-1 space-y-3">
                    {plan.features?.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0"
                          style={{ color: cfg.accentColor }}
                        />
                        <span className="text-white/80">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href={`/auth/register?plan=${plan.tier.toLowerCase()}`}
                    className="mt-8 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold transition-opacity hover:opacity-90"
                    style={{ background: cfg.accentColor, color: "#000" }}
                  >
                    Choose {plan.name}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Registration is free. No credit card required until you choose a plan.
        </p>
      </section>

      <VideoResources
        eyebrow="Free Learning"
        title="Watch the free course and free script walkthrough"
        description="Watch the free course and the free script setup here on the page."
      />

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="max-w-2xl">
          <Badge variant="outline">Reviews</Badge>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight">What NOJAI users are saying</h2>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {reviews.map((review) => (
            <Card key={review._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{review.user?.name ?? "Verified user"}</CardTitle>
                  <Badge variant="warning">{review.rating}/5</Badge>
                </div>
                <CardDescription>{formatDate(review.createdAt)}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-muted-foreground">{review.comment}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <div className="max-w-2xl">
          <Badge variant="outline">FAQ</Badge>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight">You have questions?</h2>
        </div>
        <Card className="mt-8">
          <CardContent className="p-6">
            <Accordion type="single" collapsible>
              {faqItems.map((item) => (
                <AccordionItem key={item.question} value={item.question}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>
    </MarketingShell>
  );
}