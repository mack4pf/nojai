import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";

import { ArrowRight, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "About NOJAI — Our Story & Mission",
  description:
    "Learn how Nathaniel Onoja built NOJAI to make automated trading simpler and more accessible for everyday traders on IQ Option.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About NOJAI — Our Story & Mission",
    description: "Learn how Nathaniel Onoja built NOJAI to make automated trading simpler and more accessible for everyday traders.",
    url: "/about",
  },
};

import { MarketingShell } from "@/components/layout/marketing-shell";
import { VideoResources } from "@/components/marketing/video-resources";
import { WorkflowShowcase } from "@/components/marketing/workflow-showcase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aboutHighlights, brokerSupport, howItWorks } from "@/lib/marketing";

export default function AboutPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <Badge>About NOJAI</Badge>
            <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
              Automated trading robot for IQ Option and more.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              NOJAI helps you connect your broker, set your bot, and automate your trading with a simple setup. The goal is to make automated trading easier for beginners.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {aboutHighlights.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-card/70 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                  <p className="text-sm text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <Image
                src="/profile.jpg"
                alt="Nathaniel Onoja"
                width={960}
                height={960}
                className="h-auto w-full rounded-[2rem] object-cover object-top"
              />
              <div className="px-3 pb-3 pt-6">
                <p className="text-sm uppercase tracking-[0.25em] text-primary">Founder</p>
                <h2 className="mt-3 font-display text-3xl font-semibold">Nathaniel Onoja</h2>
                <p className="mt-3 text-muted-foreground">
                  Nathaniel Onoja built NOJAI to make automated trading simpler for everyday users.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <WorkflowShowcase
        eyebrow="Workflow Map"
        title="See exactly how NOJAI moves from signal to trade"
        description="The workflow below shows how TradingView sends the alert, NOJAI checks it, and IQ Option places the trade."
      />

      <section className="mx-auto max-w-7xl px-6 py-4 lg:px-8 lg:py-10">
        <div className="max-w-2xl">
          <Badge variant="outline">How The Bot Works</Badge>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight">How the software works in 3 simple steps</h2>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {howItWorks.map((item) => (
            <Card key={item.step}>
              <CardHeader>
                <Badge className="w-fit">{item.step}</Badge>
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
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