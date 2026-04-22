import type { Metadata } from "next";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using NOJAI products and services.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "NOJAI Terms of Service",
    description: "Terms for using NOJAI products and services.",
    url: "/terms",
  },
};

export default function TermsPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <Badge>Policy</Badge>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">Terms of Service</h1>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Service terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
            <p>By using NOJAI, you agree to use the service lawfully and to keep your account credentials secure.</p>
            <p>Subscriptions and access features are provided according to active plan terms shown in your dashboard and pricing pages.</p>
            <p>NOJAI provides software tools and educational resources; trading outcomes depend on market conditions and user configuration.</p>
          </CardContent>
        </Card>
      </section>
    </MarketingShell>
  );
}
