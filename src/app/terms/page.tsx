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

const EFFECTIVE_DATE = "June 11, 2026";

export default function TermsPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <Badge>Policy</Badge>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">NOJAI Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective Date: {EFFECTIVE_DATE}</p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Service terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 text-sm leading-7 text-muted-foreground">
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">1. Introduction</h2>
              <p>
                Welcome to Nojai (&ldquo;Nojai&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). Nojai is a software
                platform that enables users to automate trading strategies by connecting third-party trading services, brokers,
                exchanges, and signal providers.
              </p>
              <p>By creating an account, accessing, or using Nojai, you agree to be bound by these Terms of Service.</p>
              <p>If you do not agree with these Terms, do not use the platform.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">2. Eligibility</h2>
              <p>You must be at least 18 years old and legally capable of entering into binding agreements.</p>
              <p>You are responsible for ensuring that use of Nojai complies with laws and regulations applicable in your jurisdiction.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">3. Nature of Service</h2>
              <p>Nojai provides software and automation technology.</p>
              <p>Nojai does not:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Accept client deposits</li>
                <li>Hold client funds</li>
                <li>Manage investment portfolios</li>
                <li>Provide financial advice</li>
                <li>Guarantee profits</li>
                <li>Execute discretionary trades on behalf of users</li>
              </ul>
              <p>Nojai acts solely as a technology platform that transmits user-configured instructions between third-party services.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">4. User Responsibilities</h2>
              <p>You are solely responsible for:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Selecting trading strategies</li>
                <li>Configuring automation settings</li>
                <li>Managing broker accounts</li>
                <li>Monitoring account activity</li>
                <li>Maintaining adequate risk controls</li>
                <li>Protecting account credentials</li>
              </ul>
              <p>You acknowledge that all trading decisions remain your responsibility.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">5. Subscription Fees</h2>
              <p>Certain features may require payment of subscription fees.</p>
              <p>Subscription fees are non-refundable except where required by law or expressly stated otherwise.</p>
              <p>Nojai may modify pricing upon reasonable notice.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">6. Prohibited Activities</h2>
              <p>Users may not:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Use Nojai for unlawful purposes</li>
                <li>Attempt unauthorized access to systems</li>
                <li>Reverse engineer the platform</li>
                <li>Distribute malware</li>
                <li>Interfere with platform operations</li>
                <li>Misrepresent performance results</li>
              </ul>
              <p>Violation may result in immediate account termination.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">7. Service Availability</h2>
              <p>Nojai does not guarantee uninterrupted service.</p>
              <p>System outages, maintenance, broker failures, internet disruptions, API failures, market conditions, or third-party issues may affect functionality.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">8. Intellectual Property</h2>
              <p>All software, branding, trademarks, designs, content, and proprietary technology remain the exclusive property of Nojai.</p>
              <p>Users receive a limited, non-transferable license to use the platform.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">9. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, Nojai, its founders, employees, affiliates, partners, and contractors shall
                not be liable for:
              </p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Trading losses</li>
                <li>Lost profits</li>
                <li>Missed opportunities</li>
                <li>Data loss</li>
                <li>System interruptions</li>
                <li>Broker errors</li>
                <li>Third-party failures</li>
                <li>Indirect or consequential damages</li>
              </ul>
              <p>Your use of Nojai is entirely at your own risk.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">10. Indemnification</h2>
              <p>You agree to indemnify and hold harmless Nojai from claims, liabilities, damages, losses, and expenses arising from your use of the platform.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">11. Termination</h2>
              <p>Nojai may suspend or terminate accounts at its discretion for violations of these Terms or activities that threaten platform integrity.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">12. Governing Law</h2>
              <p>These Terms shall be governed by the laws of the Federal Republic of Nigeria.</p>
              <p>Any disputes shall be resolved through the courts of competent jurisdiction in Nigeria.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">13. Changes to Terms</h2>
              <p>Nojai may modify these Terms from time to time. Continued use of the platform constitutes acceptance of revised Terms.</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </MarketingShell>
  );
}
