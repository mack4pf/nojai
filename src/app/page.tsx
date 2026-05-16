import type { Metadata } from "next";

import { LandingPage } from "@/components/marketing/landing-page";
import { getPricingPlans, getPublicReviews } from "@/lib/api";
import { faqItems } from "@/lib/marketing";
import type { PricingPlan, Review } from "@/types";

export const metadata: Metadata = {
  title: "NOJAI — Automated Trading for Binary Options & Forex",
  description:
    "Automated trading for Binary Options, Forex, and MT5. Over 15k+ successful trades executed. Connect any broker including IQ Option, Expert Option, and more.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "NOJAI — Advanced Trading Automation & Copy Trading",
    description: "Automated trading for Binary Options and Forex. Connect any broker and automate your strategies 24/7 with NOJAI.",
    url: "/",
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
      "Advanced trading automation for Binary Options and Forex. Connect any broker including MT5, IQ Option, and Expert Option for 24/7 automated execution.",
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
      answer: "NOJAI supports a wide range of brokers including IQ Option, Expert Option, and any MT5-compatible broker. We are constantly adding support for more platforms.",
    },
    {
      question: "Can I copy trade on MT5 with NOJAI?",
      answer: "Yes, NOJAI Pro and VIP plans offer advanced MT5 copy trading and automation features, allowing you to mirror expert strategies automatically.",
    },
    {
      question: "What is a Binary Options trading bot?",
      answer: "A Binary Options trading bot like NOJAI executes trades automatically based on technical indicators or signals, eliminating emotional trading and ensuring 24/7 market coverage.",
    },
    {
      question: "How do I connect my broker to NOJAI?",
      answer: "Connecting is simple. Use our secure dashboard to link your IQ Option, Expert Option, or MT5 account. Setup takes less than 5 minutes.",
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
      <LandingPage pricingPlans={pricingPlans} reviews={reviews} />
    </>
  );
}
