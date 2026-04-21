import type { Metadata } from "next";

import { LandingPage } from "@/components/marketing/landing-page";
import { getPricingPlans, getPublicReviews } from "@/lib/api";
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
  {
    _id: "review-1",
    rating: 5,
    comment: "I started as a beginner and the setup was straightforward. I could follow my trades without getting confused.",
    createdAt: new Date().toISOString(),
    user: { _id: "u1", name: "Amina" },
  },
  {
    _id: "review-2",
    rating: 5,
    comment: "The bots gave me a better way to start making money online without sitting in front of charts all day.",
    createdAt: new Date().toISOString(),
    user: { _id: "u2", name: "David" },
  },
  {
    _id: "review-3",
    rating: 4,
    comment: "I like that I can begin with a smaller plan and upgrade later when I want more trading options.",
    createdAt: new Date().toISOString(),
    user: { _id: "u3", name: "Sarah" },
  },
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage pricingPlans={pricingPlans} reviews={reviews} />
    </>
  );
}
