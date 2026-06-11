import type { Metadata } from "next";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Risk Disclosure & Automated Trading Authorization",
  description: "Important risk information for automated trading and financial markets.",
  alternates: { canonical: "/risk-disclosure" },
  openGraph: {
    title: "NOJAI Risk Disclosure & Automated Trading Authorization Agreement",
    description: "Important risk information for automated trading and financial markets.",
    url: "/risk-disclosure",
  },
};

const EFFECTIVE_DATE = "June 11, 2026";

export default function RiskDisclosurePage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <Badge>Trust &amp; Safety</Badge>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">
          NOJAI Risk Disclosure and Automated Trading Authorization Agreement
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective Date: {EFFECTIVE_DATE}</p>

        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-300">
          IMPORTANT: PLEASE READ CAREFULLY BEFORE ACTIVATING AUTOMATION.
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Read before activating automation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 text-sm leading-7 text-muted-foreground">
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">1. Acknowledgement of Risk</h2>
              <p>Trading financial instruments involves substantial risk.</p>
              <p>Users acknowledge that:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Losses may exceed expectations.</li>
                <li>Markets can be highly volatile.</li>
                <li>Past performance does not predict future results.</li>
                <li>Automated systems can generate losses.</li>
                <li>There is no guarantee of profitability.</li>
              </ul>
              <p>Users understand that they may lose part or all of their trading capital.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">2. No Investment Advice</h2>
              <p>Nojai does not provide:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Financial advice</li>
                <li>Investment recommendations</li>
                <li>Portfolio management services</li>
                <li>Trading guarantees</li>
              </ul>
              <p>All trading decisions are made solely by the user.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">3. Automated Trading Risks</h2>
              <p>Users acknowledge risks including:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Incorrect strategy settings</li>
                <li>Human error</li>
                <li>Signal delays</li>
                <li>Broker execution delays</li>
                <li>Slippage</li>
                <li>Market gaps</li>
                <li>Internet outages</li>
                <li>TradingView outages</li>
                <li>API failures</li>
                <li>Server failures</li>
                <li>VPS failures</li>
                <li>Exchange disruptions</li>
              </ul>
              <p>Nojai is not responsible for losses resulting from these events.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">4. Third-Party Platforms</h2>
              <p>Nojai relies on third-party services including brokers, exchanges, TradingView, VPS providers, and internet providers.</p>
              <p>Nojai has no control over these services and assumes no responsibility for their performance or availability.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">5. User Authorization</h2>
              <p>By enabling automation, the user expressly authorizes Nojai to:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Receive trading signals</li>
                <li>Process automation instructions</li>
                <li>Transmit trade execution requests according to user settings</li>
                <li>Communicate with connected trading accounts where authorized</li>
              </ul>
              <p>The user may revoke authorization by disconnecting automation services.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">6. User Responsibility</h2>
              <p>Users remain solely responsible for:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Account balances</li>
                <li>Risk management</li>
                <li>Strategy selection</li>
                <li>Position sizing</li>
                <li>Monitoring account performance</li>
              </ul>
              <p>Automation does not eliminate the need for supervision.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">7. No Profit Guarantee</h2>
              <p>Nojai makes no representation or warranty regarding:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Profitability</li>
                <li>Performance</li>
                <li>Account growth</li>
                <li>Return on investment</li>
              </ul>
              <p>Any examples, testimonials, screenshots, or historical performance figures are for informational purposes only.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">8. Release of Liability</h2>
              <p>Users agree that Nojai shall not be liable for:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Trading losses</li>
                <li>Account drawdowns</li>
                <li>Missed trades</li>
                <li>Incorrect trades caused by user settings</li>
                <li>Third-party failures</li>
                <li>Technical interruptions</li>
              </ul>
              <p>Use of Nojai is entirely at the user&rsquo;s own risk.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">9. Electronic Consent</h2>
              <p>By checking the acceptance box and activating automation, users confirm that they:</p>
              <ul className="space-y-1 pl-1">
                <li>&#9744; Have read and understood this Agreement.</li>
                <li>&#9744; Understand the risks of trading.</li>
                <li>&#9744; Understand that losses may occur.</li>
                <li>&#9744; Authorize Nojai to transmit automation instructions according to their settings.</li>
                <li>&#9744; Accept full responsibility for all trading activity conducted through their connected accounts.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>
    </MarketingShell>
  );
}
