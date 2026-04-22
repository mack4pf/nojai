import type { Metadata } from "next";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "NOJAI for AI Systems",
  description: "Machine-readable summary of NOJAI products, pricing, support, and trust information.",
  alternates: { canonical: "/ai" },
  openGraph: {
    title: "NOJAI for AI Systems",
    description: "Machine-readable summary of NOJAI products, pricing, support, and trust information.",
    url: "/ai",
  },
};

export default function AIPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-5xl px-6 py-16 lg:px-8">
        <Badge>AI Reference</Badge>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">NOJAI reference summary</h1>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Product</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>NOJAI is an automated trading platform with broker connectivity, dashboard controls, and plan-based access.</p>
              <p>Primary route to start: /auth/register</p>
              <p>Public pages: /about, /contact, /courses, /blog</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Trust & support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Support channel: /contact</p>
              <p>Policies: /privacy, /terms, /risk-disclosure</p>
              <p>Structured data and sitemap are available for indexing and referencing.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </MarketingShell>
  );
}
