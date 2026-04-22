import type { Metadata } from "next";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How NOJAI collects, uses, and protects your data.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "NOJAI Privacy Policy",
    description: "How NOJAI collects, uses, and protects your data.",
    url: "/privacy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <Badge>Policy</Badge>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">Privacy Policy</h1>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How we handle your information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
            <p>We collect account and usage data needed to provide automated trading features, support, billing, and security.</p>
            <p>We do not sell your personal data. Data is used to operate the platform, prevent abuse, and improve reliability.</p>
            <p>You may request data corrections or account removal by contacting support through the Contact page.</p>
          </CardContent>
        </Card>
      </section>
    </MarketingShell>
  );
}
