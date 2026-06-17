import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Olymp Trade Bot Free Trial",
  description: "Unlock the NOJAI Olymp Trade bot free tier by joining Olymp Trade with the partner link, depositing the admin-set minimum, and submitting your Olymp email and ID for approval.",
  alternates: { canonical: "/olymp-trade-bot" },
  keywords: [
    "Olymp Trade bot",
    "Olymp Trade free trial",
    "free Olymp Trade bot",
    "Olymp Trade trading bot",
    "Olymp Trade automation",
    "Olymp Trade signals bot",
    "Olymp Trade partner bot",
  ],
  openGraph: {
    title: "Olymp Trade Bot Free Trial | NOJAI",
    description: "Use the NOJAI Olymp Trade free tier after partner-account verification.",
    url: "/olymp-trade-bot",
    images: [{ url: "/autobot-assets/olymptrade.jpeg", width: 1200, height: 630, alt: "Olymp Trade automation on NOJAI" }],
  },
};

export default function OlympTradeBotPage() {
  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[1fr_420px] lg:items-center lg:px-8">
        <div>
          <Badge>Olymp Trade Free Tier</Badge>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Olymp Trade bot free trial</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
            NOJAI now supports free Olymp Trade access for verified partner users. Create your Olymp Trade account from the NOJAI partner link, make the minimum deposit shown in your dashboard, then submit your Olymp email and account ID for admin approval.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/auth/register">Create NOJAI account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/login">Go to dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <Image
            src="/autobot-assets/olymptrade.jpeg"
            alt="Olymp Trade bot free trial"
            width={900}
            height={620}
            className="h-full min-h-[320px] w-full object-cover"
            priority
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["1", "Join with the partner link", "Use the Olymp Trade link shown inside your NOJAI dashboard so your account can be verified."],
            ["2", "Deposit the minimum amount", "The minimum deposit is controlled by admin and can be changed anytime from the Olymp Free admin page."],
            ["3", "Submit email and ID", "Send your Olymp Trade account email and ID. Admin approves or declines the request with a reason."],
          ].map(([step, title, copy]) => (
            <div key={step} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Step {step}</p>
              <h2 className="mt-2 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
