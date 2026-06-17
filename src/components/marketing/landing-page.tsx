import Link from "next/link";
import Image from "next/image";

import { ArrowRight, CheckCircle2, ChevronRight, Crown, Sparkles, Zap ,Star} from "lucide-react";

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
import { AffiliateLocalePromo } from "@/components/marketing/affiliate-locale-promo";
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
      logo: "/autobot-assets/experoptionlogo.png",
      logoWidth: 180,
      logoHeight: 44,
      status: "live",
      color: "#1565C0",
      bg: "#010a1a",
      description: "Connect your Expert Option account and start automated trading now.",
    },
    {
      name: "Olymp Trade",
      logo: "/autobot-assets/olymptrade.jpeg",
      logoWidth: 160,
      logoHeight: 40,
      status: "live",
      color: "#10B981",
      bg: "#00140d",
      description: "Connect Olymp Trade accounts and automate EURUSD binary signals.",
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
      logo: "/mt5logo.png",
      logoWidth: 160,
      logoHeight: 40,
      status: "live",
      color: "#1565C0",
      bg: "#00030f",
      description: "MetaTrader 5 is now live. Connect your trading account today.",
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

const BINARY_DEFAULT_ASSETS = ["EURUSD"];
const MT5_DEFAULT_ASSETS = ["BTCUSD", "EURUSD", "XAUUSD"];

interface LandingPageProps {
  pricingPlans?: PricingPlan[];
  reviews: Review[];
}

export function LandingPage({ pricingPlans, reviews }: LandingPageProps) {
  const plansToShow: PricingPlan[] = pricingPlans?.length ? pricingPlans : publicPricingPlans.map((plan) => ({
    ...plan,
    features: [...plan.features],
  }));
  const maxDiscountPercent = Math.max(
    ...plansToShow.map((plan) => {
      const compare = plan.compareAtPrice ?? plan.price;
      return compare > plan.price ? Math.round(((compare - plan.price) / compare) * 100) : 0;
    }),
    0,
  );

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
              Automated Trading for Binary Options & Forex.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Connect any broker and automate your strategies 24/7. NOJAI handles the execution while you focus on what matters.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2">Get started simple</span>
              <span className="inline-flex h-10 items-center gap-2 rounded-full border border-primary/30 bg-card px-3 shadow-sm transition-transform hover:scale-105">
                <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full ring-1 ring-border">
                  <Image src="/mt5logo.png" alt="MetaTrader 5" width={28} height={28} className="h-full w-full object-cover" />
                </span>
                <span className="text-xs font-bold text-foreground">MT5 Trading</span>
              </span>
              <span className="inline-flex h-10 items-center gap-2 rounded-full border border-[#ff7803]/25 bg-card px-3 shadow-sm transition-transform hover:scale-105">
                <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full">
                  <Image src="/autobot-assets/iq-option-small.svg" alt="IQ Option" width={28} height={28} className="h-full w-full object-contain" />
                </span>
                <span className="text-xs font-bold text-foreground">IQ Option</span>
              </span>
              <span className="inline-flex h-10 items-center gap-2 rounded-full border border-[#1565c0]/25 bg-card px-3 shadow-sm transition-transform hover:scale-105">
                <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full">
                  <Image src="/autobot-assets/experoptionlogo.png" alt="ExpertOption" width={28} height={28} className="h-full w-full object-contain" />
                </span>
                <span className="text-xs font-bold text-foreground">ExpertOption</span>
              </span>
              <span className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-500/25 bg-card px-3 shadow-sm transition-transform hover:scale-105">
                <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white p-0.5">
                  <Image src="/autobot-assets/olymptrade.jpeg" alt="Olymp Trade" width={28} height={28} className="h-full w-full rounded-full object-cover" />
                </span>
                <span className="text-xs font-bold text-foreground">Olymp Trade</span>
              </span>
              <span className="inline-flex h-10 items-center gap-2 rounded-full border border-[#2962ff]/25 bg-[#2962ff] px-3 shadow-sm transition-transform hover:scale-105">
                <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full">
                  <Image src="/autobot-assets/tradingview.svg" alt="TradingView" width={28} height={28} className="h-full w-full object-contain" />
                </span>
                <span className="text-xs font-bold text-white">TradingView</span>
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-2">
                Binary Options default: <strong className="font-bold text-foreground">{BINARY_DEFAULT_ASSETS.join(", ")}</strong>
              </span>
              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/[0.06] px-4 py-2">
                MT5 leverage defaults: <strong className="font-bold text-foreground">{MT5_DEFAULT_ASSETS.join(", ")}</strong>
              </span>
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
            <div className="mt-8 flex flex-col items-start gap-3">
              <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-5 py-2 text-sm font-medium text-primary">
                Registration is free. Current plan pricing: {pricingSummary}.
              </div>
              <AffiliateLocalePromo />
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ["15k+", "Successful trades executed"],
                ["24/7", "Automated trading coverage"],
                ["MT5 & IQ", "Multi-broker support"],
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
            <CardContent className="relative p-0">
              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/20">
                <Image
                  src="/autobot-assets/nojai.svg"
                  alt="NOJAI trading dashboard preview"
                  width={1600}
                  height={1200}
                  className="h-auto w-full rounded-[2rem]"
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
            Connect any broker. Trade any market.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            NOJAI is built to be broker-agnostic. Whether you trade Binary Options on IQ Option, Expert Option, or Olymp Trade, or Forex on MT5, we have you covered.
          </p>
        </div>

        {/* MT5 hero card */}
        <div className="broker-live-card-mt5 animate-nojai-slide-up mt-12 overflow-hidden rounded-[2rem] border-2 border-primary/20 bg-card text-card-foreground">
          <div className="grid items-center gap-0 lg:grid-cols-[1fr_1fr]">
            <div className="border-b border-border p-8 lg:border-b-0 lg:border-r lg:p-12">
              <div className="flex items-center gap-3">
                <span
                  className="animate-nojai-live-dot inline-block h-3 w-3 rounded-full"
                  style={{ background: "#22c55e" }}
                />
                <span className="text-sm font-bold uppercase tracking-[0.3em] text-[#22c55e]">Live now</span>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-card p-1 shadow-sm ring-1 ring-border">
                  <Image
                    src="/mt5logo.png"
                    alt="MetaTrader 5"
                    width={32}
                    height={32}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="text-2xl font-black tracking-tight">MetaTrader 5</span>
              </div>
              <p className="mt-5 text-xl font-semibold">
                Forex automation is here. Connect your MT5 account.
              </p>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                Mirror expert trades or automate your own signals on any MT5 broker. NOJAI handles the execution and risk management, so you can trade Forex and Gold 24/7.
              </p>
              <Button asChild className="mt-8" size="lg">
                <Link href="/mt5-trading">
                  How to connect MT5
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="bg-muted/30 p-8 lg:p-12">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">What you get</p>
              <ul className="mt-6 space-y-5">
                {[
                  ["Manual Trade Copying", "Mirror trades from professional providers with one click"],
                  ["Webhook Signal Automation", "Connect TradingView and execute MT5 trades automatically"],
                  ["Risk-Based Lot Sizing", "Specify your exact dollar risk, and the bot calculates the lots"],
                  ["Works with ALL Brokers", "Search for your server and connect any MT5 broker account"],
                ].map(([title, desc]) => (
                  <li key={title} className="flex items-start gap-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-semibold">{title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* IQ Option hero card */}
        <div className="broker-live-card animate-nojai-slide-up mt-6 overflow-hidden rounded-[2rem] border-2">
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
              <p className="mt-5 text-xl font-semibold text-foreground">
                The original broker. Connect and trade today.
              </p>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
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
                      <p className="font-semibold text-foreground">{title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Expert Option hero card */}
        <div className="broker-live-card-eo animate-nojai-slide-up mt-6 overflow-hidden rounded-[2rem] border-2">
          <div className="grid items-center gap-0 lg:grid-cols-[1fr_1fr]">
            <div className="border-b p-8 lg:border-b-0 lg:border-r lg:p-12" style={{ borderColor: "#1565C033" }}>
              <div className="flex items-center gap-3">
                <span
                  className="animate-nojai-live-dot inline-block h-3 w-3 rounded-full"
                  style={{ background: "#22c55e" }}
                />
                <span className="text-sm font-bold uppercase tracking-[0.3em] text-[#22c55e]">Live now</span>
              </div>
              <div className="mt-6">
                <Image
                  src="/autobot-assets/expert-option-real.svg"
                  alt="ExpertOption"
                  width={200}
                  height={50}
                  className="h-10 w-auto"
                />
              </div>
              <p className="mt-5 text-xl font-semibold text-foreground">
                Now live. Automate your Expert Option account.
              </p>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                Expert Option is now fully supported on NOJAI. Connect using your browser session token and let the bot trade on demo or real mode â€” no password required.
              </p>
              <Button asChild className="mt-8" size="lg" style={{ background: "#1565C0" }}>
                <Link href="/auth/register">
                  Connect ExpertOption
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="p-8 lg:p-12">
              <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: "#4fc3f7" }}>What you get</p>
              <ul className="mt-6 space-y-5">
                {[
                  ["Demo & real mode switching", "Instantly toggle between demo and real trading from your dashboard"],
                  ["Token-based auth", "No password needed â€” connect securely with your browser session token"],
                  ["Live dual balance display", "See your demo and real balances side by side, updated in real time"],
                  ["EO copy trading (VIP)", "VIP users can auto-copy trades across multiple Expert Option accounts"],
                ].map(([title, desc]) => (
                  <li key={title} className="flex items-start gap-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "#4fc3f7" }} />
                    <div>
                      <p className="font-semibold text-foreground">{title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Olymp Trade hero card */}
        <div className="animate-nojai-slide-up mt-6 overflow-hidden rounded-[2rem] border-2 border-emerald-500/25 bg-emerald-500/[0.03]">
          <div className="grid items-center gap-0 lg:grid-cols-[1fr_1fr]">
            <div className="border-b border-emerald-500/20 p-8 lg:border-b-0 lg:border-r lg:p-12">
              <div className="flex items-center gap-3">
                <span className="animate-nojai-live-dot inline-block h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-400">Live now</span>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5">
                  <Image src="/autobot-assets/olymptrade.jpeg" alt="Olymp Trade" width={44} height={44} className="h-full w-full rounded-xl object-cover" />
                </span>
                <span className="text-2xl font-black tracking-tight">Olymp Trade</span>
              </div>
              <p className="mt-5 text-xl font-semibold text-foreground">
                Olymp Trade automation is ready for binary users.
              </p>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                Connect with your Olymp session token, trade live or demo groups, and route TradingView signals to all connected Olymp accounts.
              </p>
              <Button asChild className="mt-8 bg-emerald-600 hover:bg-emerald-500" size="lg">
                <Link href="/auth/register">
                  Connect Olymp Trade
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="p-8 lg:p-12">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">Production-ready flow</p>
              <ul className="mt-6 space-y-5">
                {[
                  ["Default binary asset", <>Signals default to <strong className="font-bold text-foreground">EURUSD</strong> for Binary Options.</>],
                  ["Multi-user execution", "PRO and VIP Olymp accounts receive broadcast signals through the same dispatcher as the other brokers."],
                  ["Currency-aware analytics", "Balances and P/L stay grouped by each account currency on the dashboard."],
                  ["Result reconciliation", "Expired Olymp trades are reconciled from balance movement so history and charts do not stay pending."],
                ].map(([title, desc]) => (
                  <li key={String(title)} className="flex items-start gap-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    <div>
                      <p className="font-semibold text-foreground">{title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Coming soon grid */}
        <p className="mt-12 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">Coming next</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {brokerData.filter((b) => b.status === "soon").map((broker, index) => (
            <div
              key={broker.name}
              className="broker-soon-card animate-nojai-slide-up group relative overflow-hidden rounded-[1.5rem] border border-white/[0.08] p-6 transition-transform duration-300 hover:-translate-y-1"
              style={{
                ["--broker-bg" as string]: broker.bg,
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
              <p className="mt-5 text-sm font-semibold text-foreground">{broker.name}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{broker.description}</p>
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
              Simple plans. Launch pricing live now.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Registration is free. Subscribe only when you are ready. Every plan is at launch discount pricing today.
            </p>
          </div>
          <div
            className="pricing-discount-card animate-nojai-scale-in flex shrink-0 flex-col items-center justify-center rounded-[1.75rem] px-8 py-6 text-center"
          >
            <p className="text-4xl font-black" style={{ color: "#4ade80" }}>{maxDiscountPercent}%</p>
            <p className="mt-1 text-sm font-bold uppercase tracking-[0.22em] text-foreground">OFF</p>
            <p className="mt-2 text-xs text-muted-foreground">Launch campaign</p>
          </div>
        </div>

        {/* Plan cards */}
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plansToShow.map((plan, index) => {
            const cfg = planConfig[plan.tier as keyof typeof planConfig] ?? planConfig.PRO;
            const compareAt = plan.compareAtPrice && plan.compareAtPrice > plan.price ? plan.compareAtPrice : cfg.compareAt;
            const Icon = cfg.icon;
            const currency = getPlanCurrency(plan.currency);
            const planFeatures = [
              ...(plan.features ?? []),
              "Binary Options on IQ Option, ExpertOption, and Olymp Trade",
              `Binary default asset: ${BINARY_DEFAULT_ASSETS.join(", ")}`,
              `MT5 leverage defaults: ${MT5_DEFAULT_ASSETS.join(", ")}`,
              "Binary Options & Forex support",
              "Multi-broker account management",
            ].filter((feature, featureIndex, arr) => arr.findIndex((item) => item.toLowerCase() === feature.toLowerCase()) === featureIndex);

            return (
              <div
                key={plan._id}
                className="pricing-plan-card animate-nojai-slide-up relative flex flex-col overflow-hidden rounded-[2rem] border"
                data-popular={plan.isPopular ? "true" : "false"}
                style={{
                  ["--plan-bg" as string]: cfg.headerBg,
                  ["--plan-border" as string]: plan.isPopular ? cfg.accentColor : "rgba(255,255,255,0.1)",
                  ["--plan-accent" as string]: cfg.accentColor,
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
                    <p className="text-lg font-bold text-foreground">{plan.name}</p>
                  </div>

                  {/* Price */}
                  <div className="mt-7">
                    <div className="flex items-end gap-3">
                      <p className="font-display text-6xl font-black text-foreground">
                        {formatCurrency(plan.price, currency)}
                      </p>
                      <span className="pb-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{currency}</span>
                      {compareAt > plan.price ? (
                        <div className="pb-2">
                          <p className="text-2xl font-semibold text-muted-foreground/50 line-through">{formatCurrency(compareAt, currency)}</p>
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Every {plan.durationInDays} days{compareAt > plan.price ? <> · You save {formatCurrency(compareAt - plan.price, currency)}</> : null}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="my-6 h-px w-full" style={{ background: "rgba(255,255,255,0.07)" }} />

                  <p className="mb-5 text-sm text-muted-foreground">{cfg.summary}</p>

                  {/* Features */}
                  <ul className="flex-1 space-y-3">
                    {planFeatures.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0"
                          style={{ color: cfg.accentColor }}
                        />
                        <span className="text-foreground/85">{feature}</span>
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
            <CardTitle className="text-lg">
              {review.userName ?? "Verified user"}
            </CardTitle>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < review.rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-muted text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>
          <CardDescription>{formatDate(review.createdAt)}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-7 text-muted-foreground">
            {review.comment}
          </p>
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
