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
  return (
    <MarketingShell>
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid gap-12 lg:items-center">
          <div>
            <Badge>About NOJAI</Badge>
            <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
              Automated trading robot for IQ Option and more.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              NOJAI helps you connect your broker, set your bot, and automate your trading with a simple setup. The goal is to make automated trading easier for beginners.
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