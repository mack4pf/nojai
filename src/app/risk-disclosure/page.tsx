import type { Metadata } from "next";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Risk Disclosure",
  description: "Important risk information for automated trading and financial markets.",
  alternates: { canonical: "/risk-disclosure" },
  openGraph: {
    title: "NOJAI Risk Disclosure",
    description: "Important risk information for automated trading and financial markets.",
    url: "/risk-disclosure",
  },
};

export default function RiskDisclosurePage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <Badge>Trust & Safety</Badge>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">Risk Disclosure</h1>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Read before trading</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
            <p>Trading involves financial risk. Past results do not guarantee future returns.</p>
            <p>Automated execution can improve speed, but it does not remove market risk or loss potential.</p>
            <p>Use proper risk limits, start with amounts you can afford to lose, and review your setup regularly.</p>
          </CardContent>
        </Card>
      </section>
    </MarketingShell>
  );
}
