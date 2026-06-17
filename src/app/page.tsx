import type { Metadata } from "next";

import { LandingPage } from "@/components/marketing/landing-page";
import { getPricingPlans, getPublicReviews } from "@/lib/api";
import { faqItems } from "@/lib/marketing";
import type { PricingPlan, Review } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "NOJAI — Automated Trading for Binary Options & Forex",
  description:
    "Automated trading for Binary Options, Forex, and MT5. Unlock the Olymp Trade free tier, or connect IQ Option, Expert Option, and MT5. Binary default: EURUSD. MT5 defaults: BTCUSD, EURUSD, XAUUSD.",
  alternates: { canonical: "https://nojai.io" },
  openGraph: {
    title: "NOJAI — Advanced Trading Automation & Copy Trading",
    description: "Automated trading for Binary Options and Forex. Connect any broker and automate your strategies 24/7 with NOJAI.",
    url: "https://nojai.io",
  },
};

const fallbackPlans: PricingPlan[] = [
  {
    _id: "standard",
    name: "Standard",
    slug: "standard",
    tier: "STANDARD",
    price: 30,
    currency: "",
    durationInDays: 30,
    features: ["24/7 bot access", "Live dashboard", "Multi-broker support"],
  },
  {
    _id: "pro",
    name: "Pro",
    slug: "pro",
    tier: "PRO",
    price: 50,
    currency: "",
    durationInDays: 30,
    features: ["Everything in Standard", "Forex & Binary automation", "MT5 Copy Trading"],
    isPopular: true,
  },
  {
    _id: "vip",
    name: "VIP",
    slug: "vip",
    tier: "VIP",
    price: 75,
    currency: "",
    durationInDays: 30,
    features: ["Everything in Pro", "Priority execution", "Unlimited broker accounts"],
  },
];

const fallbackReviews: Review[] = [

];

export default async function Home() {
  const [pricingPlans, reviews] = await Promise.all([
    getPricingPlans().catch(() => fallbackPlans),
    getPublicReviews().catch(() => fallbackReviews),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "NOJAI",
    url: "https://nojai.io",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    description:
      "Advanced trading automation for Binary Options and Forex. Unlock Olymp Trade free tier access, or connect MT5, IQ Option, and Expert Option for 24/7 automated execution. Binary default: EURUSD. MT5 defaults: BTCUSD, EURUSD, XAUUSD.",
    offers: pricingPlans.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      price: plan.price,
      priceCurrency: plan.currency || "USD",
      description: plan.features?.join(", "),
    })),
    aggregateRating:
      reviews.length > 0
        ? {
          "@type": "AggregateRating",
          ratingValue: (
            reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
          ).toFixed(1),
          reviewCount: reviews.length,
          bestRating: 5,
          worstRating: 1,
        }
        : undefined,
  };

  // Add high-intent SEO questions
  const seoQuestions = [
    {
      question: "How to automate Binary Options and Forex trading?",
      answer: "NOJAI provides a seamless automation platform for Binary Options and Forex. Connect your favorite broker, set your strategy, and let the AI execute trades 24/7.",
    },
    {
      question: "Which brokers does NOJAI support?",
      answer: "NOJAI supports IQ Option, Expert Option, Olymp Trade, and any MT5-compatible broker. Binary Options default to EURUSD, while MT5 leverage trading defaults to BTCUSD, EURUSD, and XAUUSD.",
    },
    {
      question: "Can I copy trade on MT5 with NOJAI?",
      answer: "Yes, NOJAI plans with MT5 access offer copy trading and automation features, allowing you to mirror expert strategies automatically.",
    },
    {
      question: "What is a Binary Options trading bot?",
      answer: "A Binary Options trading bot like NOJAI executes trades automatically based on technical indicators or signals, eliminating emotional trading and ensuring 24/7 market coverage.",
    },
    {
      question: "How do I connect my broker to NOJAI?",
      answer: "Connecting is simple. Use our secure dashboard to link your IQ Option, Expert Option, Olymp Trade, or MT5 account. Setup takes less than 5 minutes.",
    },
    {
      question: "Does NOJAI have an affiliate program for influencers?",
      answer: "Yes! Join the NOJAI Affiliate Program to earn rewards. We support both local (Naira) and international (USD) payouts, tracked automatically through your unique referral link.",
    },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      ...seoQuestions.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
      ...faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/*
        ── Static SEO content block ──────────────────────────────────────────
        This section is rendered as pure server-side HTML so that search engine
        crawlers that do not execute JavaScript can still index the H1, page
        description, and internal links. It is visually hidden from regular
        users via an accessible off-screen technique (does NOT use display:none
        or visibility:hidden — screen readers and crawlers both see it).
      */}
      <div
        aria-hidden="false"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        <h1>NOJAI — Automated Trading Bot for Binary Options, Forex &amp; MT5</h1>
        <p>
          NOJAI is an automated trading platform that connects your broker account
          — IQ Option, Expert Option, or any MetaTrader 5 (MT5) broker — and
          executes trades for you 24 hours a day, 7 days a week. Over 15,000
          successful trades have been executed on the platform.
        </p>
        <h2>How automated trading works with NOJAI</h2>
        <p>
          Connect your broker account from the NOJAI dashboard, set your trade
          amount and risk settings, and activate the bot. NOJAI reads signals from
          TradingView or from professional copy trading providers and places trades
          directly on your broker account with zero manual input required.
        </p>
        <h2>Supported brokers</h2>
        <p>
          NOJAI currently supports IQ Option, Expert Option, and MetaTrader 5 (MT5)
          for Forex and Gold automation. Pocket Option and crypto trading support
          are coming soon. You can connect any MT5 broker — including prop firm
          accounts — using your server name and login credentials.
        </p>
        <h2>Plans and pricing</h2>
        <p>
          The Standard plan starts at $30 per month and includes bot access and
          trading signals. Standard users can enable copy trading, while higher
          plans add more automation power. The VIP plan at $75 per month gives
          you access to TradingView webhook automation, the ability to use your
          own strategy, and multi-account support.
        </p>
        <h2>Pass your prop firm challenge with MT5 automation</h2>
        <p>
          MetaTrader 5 is now live on NOJAI. You can connect your prop firm
          challenge account and use the NOJAI bot to execute trades automatically.
          Set a fixed dollar risk per trade to stay within drawdown limits. The bot
          monitors the market 24/7 so you never miss a setup during the London or
          New York sessions.
        </p>
        <h2>Copy trading for beginners</h2>
        <p>
          With an active NOJAI plan, you can copy trades from professional
          traders directly onto your broker account. No strategy knowledge is
          required. The bot mirrors entry, exit, stop loss, and take profit
          automatically.
        </p>
        <nav aria-label="Important pages">
          <ul>
            <li><a href="/auth/register">Create a free NOJAI account</a></li>
            <li><a href="/mt5-trading">How to connect MT5 to NOJAI</a></li>
            <li><a href="/copy-trading-for-beginners">Copy trading for beginners</a></li>
            <li><a href="/iq-option-bot">IQ Option automated trading bot</a></li>
            <li><a href="/tradingview-webhook-bot">TradingView webhook trading bot</a></li>
            <li><a href="/courses">Free trading courses</a></li>
            <li><a href="/blog">NOJAI Journal — trading guides and updates</a></li>
            <li><a href="/about">About NOJAI</a></li>
            <li><a href="/contact">Contact and support</a></li>
          </ul>
        </nav>
      </div>

      <LandingPage pricingPlans={pricingPlans} reviews={reviews} />
    </>
  );
}
