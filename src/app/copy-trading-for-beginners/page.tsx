import type { Metadata } from "next";
import Link from "next/link";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Copy Trading for Beginners",
  description: "Beginner-friendly overview of copy trading concepts, risk controls, and how NOJAI plan tiers support automation workflows.",
  alternates: { canonical: "/copy-trading-for-beginners" },
  openGraph: {
    title: "Copy Trading for Beginners | NOJAI",
    description: "Beginner-friendly overview of copy trading concepts, risk controls, and how NOJAI plan tiers support automation workflows.",
    url: "/copy-trading-for-beginners",
  },
};

export default function CopyTradingForBeginnersPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <Badge>Guide</Badge>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">Copy trading for beginners</h1>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Before you start</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
            <p>Copy trading can reduce manual workload but still carries financial risk and requires clear plan settings.</p>
            <p>Use realistic position sizing, monitor account behavior, and review your setup over time.</p>
            <p>NOJAI plan options let users start simple and scale to advanced workflows when ready.</p>
            <Button asChild>
              <Link href="/dashboard/subscription">View plans</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </MarketingShell>
  );
}
