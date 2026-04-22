import type { Metadata } from "next";

import Link from "next/link";

import { ArrowRight, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "About NOJAI — Our Story & Mission",
  description:
    "Learn about NOJAI's mission to make automated trading simpler and more accessible for everyday traders.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About NOJAI — Our Story & Mission",
    description: "Learn about NOJAI's mission to make automated trading simpler and more accessible for everyday traders.",
    url: "/about",
  },
};

import { MarketingShell } from "@/components/layout/marketing-shell";
import { VideoResources } from "@/components/marketing/video-resources";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aboutHighlights, brokerSupport } from "@/lib/marketing";

export default function AboutPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nojai.io";
  const aboutJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About NOJAI",
    url: `${siteUrl}/about`,
    description: "Learn about NOJAI's mission, product scope, and broker automation roadmap. Need help to start trading? Discover how to become a profitable trader, use a trading bot, or copy trade expert traders. Our platform is built for beginners and experts alike.",
    mainEntity: [
      {
        "@type": "Question",
        name: "Need help to start trading?",
        acceptedAnswer: { "@type": "Answer", text: "NOJAI makes it easy for beginners. Connect your broker, set your amount, and let the bot trade for you automatically." }
      },
      {
        "@type": "Question",
        name: "How to become a profitable trader?",
        acceptedAnswer: { "@type": "Answer", text: "Use automation, risk management, and copy trading features to improve your results. NOJAI helps you learn and earn at the same time." }
      },
      {
        "@type": "Question",
        name: "How to copy trade expert traders?",
        acceptedAnswer: { "@type": "Answer", text: "With NOJAI Pro and VIP plans, you can copy trades from top strategies and automate your trading 24/7." }
      },
      {
        "@type": "Question",
        name: "What is a trading bot?",
        acceptedAnswer: { "@type": "Answer", text: "A trading bot is software that executes trades for you based on your chosen strategy. NOJAI handles everything from signals to execution." }
      },
      {
        "@type": "Question",
        name: "Need help?",
        acceptedAnswer: { "@type": "Answer", text: "Our support team is available 24/7. Contact us anytime for setup or trading questions." }
      },
    ],
    isPartOf: {
      "@type": "WebSite",
      name: "NOJAI",
      url: siteUrl,
    },
  };

  return (
    <MarketingShell>
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
        />
        <div className="grid gap-12 lg:items-center">
          <div>
            <Badge>About NOJAI</Badge>
            <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
              Automated trading robot for IQ Option and more.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Need help to start trading? Want to become a profitable trader or copy trade expert traders? NOJAI helps you connect your broker, set your bot, and automate your trading with a simple setup. The goal is to make automated trading easier for beginners and experts alike.
            </p>
            <div className="mt-6 max-w-3xl rounded-2xl border border-primary/20 bg-primary/10 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-primary">Our Strategy</p>
              <p className="mt-2 text-base leading-7 text-muted-foreground">
                Our strategy sources trades from one of the best charting platforms into NOJAI, and execution is then triggered instantly on your preferred broker.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {aboutHighlights.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-card/70 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                  <p className="text-sm text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <VideoResources
        eyebrow="Free Videos"
        title="Start learning with the free IQ Option course and free script"
        description="These videos explain the basics and show the free script setup."
      />

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Badge variant="outline" className="w-fit">Automation</Badge>
              <CardTitle>Trade 24/7 without watching charts all day</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
              <p>
                Once your broker is connected and your amount is set, the bot can keep running for you without constant manual input.
              </p>
              <p>
                That makes it easier for beginners to start without getting stuck in complicated steps.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Badge variant="outline" className="w-fit">Broker Roadmap</Badge>
              <CardTitle>Starting with IQ Option and expanding further</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {brokerSupport.map((broker) => (
                <div key={broker.name} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                  <span className="font-medium text-foreground">{broker.name}</span>
                  <Badge variant={broker.status === "Live now" ? "default" : "secondary"}>{broker.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="mt-10">
          <Button asChild size="lg">
            <Link href="/auth/register">
              Start with NOJAI
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingShell>
  );
}