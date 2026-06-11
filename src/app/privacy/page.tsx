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

const EFFECTIVE_DATE = "June 11, 2026";

export default function PrivacyPolicyPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <Badge>Policy</Badge>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">NOJAI Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective Date: {EFFECTIVE_DATE}</p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How we handle your information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 text-sm leading-7 text-muted-foreground">
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">1. Introduction</h2>
              <p>This Privacy Policy explains how Nojai collects, uses, stores, and protects personal information.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-base font-semibold text-foreground">2. Information We Collect</h2>
              <p>We may collect:</p>

              <div className="space-y-2">
                <h3 className="font-medium text-foreground">Account Information</h3>
                <ul className="list-disc space-y-1 pl-6">
                  <li>Name</li>
                  <li>Email address</li>
                  <li>Username</li>
                  <li>Password (encrypted)</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium text-foreground">Technical Information</h3>
                <ul className="list-disc space-y-1 pl-6">
                  <li>Device information</li>
                  <li>Browser information</li>
                  <li>IP address</li>
                  <li>Operating system</li>
                  <li>Usage analytics</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium text-foreground">Trading Automation Information</h3>
                <ul className="list-disc space-y-1 pl-6">
                  <li>Connected broker information</li>
                  <li>Trading preferences</li>
                  <li>Automation settings</li>
                  <li>Strategy configurations</li>
                  <li>Alert and execution logs</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium text-foreground">Payment Information</h3>
                <p>Payments may be processed through third-party providers. Nojai does not store full payment card information.</p>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">3. How We Use Information</h2>
              <p>We use information to:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Provide services</li>
                <li>Process subscriptions</li>
                <li>Improve platform functionality</li>
                <li>Monitor system security</li>
                <li>Communicate updates</li>
                <li>Comply with legal obligations</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">4. Information Sharing</h2>
              <p>Nojai does not sell personal information.</p>
              <p>Information may be shared with:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Service providers</li>
                <li>Payment processors</li>
                <li>Cloud infrastructure providers</li>
                <li>Legal authorities when required by law</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">5. Data Security</h2>
              <p>Nojai implements reasonable technical and organizational measures to protect user information.</p>
              <p>However, no system can guarantee absolute security.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">6. Data Retention</h2>
              <p>Information may be retained as long as necessary to provide services, comply with legal obligations, resolve disputes, and enforce agreements.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">7. User Rights</h2>
              <p>Subject to applicable law, users may request:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Access to personal information</li>
                <li>Correction of inaccurate information</li>
                <li>Deletion of information</li>
                <li>Withdrawal of consent</li>
              </ul>
              <p>Requests may be submitted through official support channels.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">8. Cookies</h2>
              <p>Nojai may use cookies and similar technologies to improve user experience and platform functionality.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">9. International Transfers</h2>
              <p>User information may be processed or stored in locations outside the user&rsquo;s country.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">10. Changes to Privacy Policy</h2>
              <p>Nojai may update this Privacy Policy periodically. Continued use of the platform constitutes acceptance of changes.</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </MarketingShell>
  );
}
