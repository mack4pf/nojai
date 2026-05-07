import type { Metadata } from "next";

import { LandingPage } from "@/components/marketing/landing-page";
import { getPricingPlans, getPublicReviews } from "@/lib/api";
import { faqItems } from "@/lib/marketing";
import type { PricingPlan, Review } from "@/types";

export const metadata: Metadata = {
  title: "NOJAI — Automated Trading Bot for IQ Option",
  description:
    "Let NOJAI trade for you 24/7. Connect your IQ Option broker, pick a plan, and activate your bot in minutes. Standard, Pro & VIP plans available.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "NOJAI — Automated Trading Bot for IQ Option",
    description: "Let NOJAI trade for you 24/7. Connect your IQ Option broker, pick a plan, and activate your bot in minutes.",
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
    features: ["24/7 bot access", "Live dashboard", "Beginner setup flow"],
  },
  {
    _id: "pro",
    name: "Pro",
    slug: "pro",
    tier: "PRO",
    price: 50,
    currency: "",
    durationInDays: 30,
    features: ["Everything in Standard", "Stronger bot access", "More growth tools"],
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
    features: ["Everything in Pro", "VIP bot access", "Priority setup support"],
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
      "Automated trading bot for IQ Option. Connect your broker, activate a plan, and let NOJAI trade for you 24/7.",
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
      question: "Need help to start trading?",
      answer: "NOJAI makes it easy for beginners. Connect your broker, set your amount, and let the bot trade for you automatically.",
    },
    {
      question: "How to become a profitable trader?",
      answer: "Use automation, risk management, and copy trading features to improve your results. NOJAI helps you learn and earn at the same time.",
    },
    {
      question: "How to copy trade expert traders?",
      answer: "With NOJAI Pro and VIP plans, you can copy trades from top strategies and automate your trading 24/7.",
    },
    {
      question: "What is a trading bot?",
      answer: "A trading bot is software that executes trades for you based on your chosen strategy. NOJAI handles everything from signals to execution.",
    },
    {
      question: "Need help?",
      answer: "Our support team is available 24/7. Contact us anytime for setup or trading questions.",
    },
    {
      question: "How to start earning money as a content creator or influencer?",
      answer: "Join the NOJAI Affiliate Program. Nigerian referrals show Naira rewards, while international referrals show USD rewards. Share your link, your friend subscribes, and your reward is tracked automatically.",
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
