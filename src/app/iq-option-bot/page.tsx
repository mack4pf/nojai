import type { Metadata } from "next";
import Link from "next/link";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "IQ Option Trading Bot",
  description: "Looking for an IQ Option trading bot? Learn how NOJAI connects TradingView signals to broker execution with plan-based access.",
  alternates: { canonical: "/iq-option-bot" },
  openGraph: {
    title: "IQ Option Trading Bot | NOJAI",
    description: "Learn how NOJAI connects TradingView signals to broker execution with plan-based access.",
    url: "/iq-option-bot",
  },
};

export default function IQOptionBotPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <Badge>Guide</Badge>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">IQ Option trading bot guide</h1>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How NOJAI works with IQ Option</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
            <p>NOJAI is the premier automation platform for IQ Option users. While we started with IQ Option, our platform now supports Expert Option and any MT5-compatible broker, allowing you to manage all your trading automation in one place.</p>
            <p>Signals can be sourced from TradingView or expert strategies and passed into NOJAI for instant execution on your IQ Option account or other connected brokers.</p>
            <p>Whether you are trading Binary Options or Forex, NOJAI provides the tools you need to automate your workflow 24/7.</p>
            <Button asChild>
              <Link href="/auth/register">Create account</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </MarketingShell>
  );
}
