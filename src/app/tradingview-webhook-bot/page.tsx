import type { Metadata } from "next";
import Link from "next/link";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "TradingView Webhook Bot",
  description: "Understand how TradingView webhook alerts can be routed to NOJAI and executed on connected broker accounts.",
  alternates: { canonical: "/tradingview-webhook-bot" },
  openGraph: {
    title: "TradingView Webhook Bot | NOJAI",
    description: "Understand how TradingView webhook alerts can be routed to NOJAI and executed on connected broker accounts.",
    url: "/tradingview-webhook-bot",
  },
};

export default function TradingViewWebhookBotPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <Badge>Guide</Badge>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">TradingView webhook bot workflow</h1>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Signal to execution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
            <p>TradingView alerts can be configured to deliver structured signal data into NOJAI.</p>
            <p>NOJAI validates signal input and triggers execution through your selected broker connection settings.</p>
            <p>This flow helps users who want repeatable automation with clear dashboard visibility.</p>
            <Button asChild>
              <Link href="/about">Learn more</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </MarketingShell>
  );
}
