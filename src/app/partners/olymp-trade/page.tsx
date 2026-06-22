import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ArrowRight, CheckCircle2, ExternalLink, Gift, ShieldCheck, Sparkles } from "lucide-react";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const OLYMP_REGISTRATION_LINK = "https://olymp.gl/4Ob6l";
const OLYMP_BONUS_CODE = "NOJAI";

export const metadata: Metadata = {
  title: "NOJAI Partner - Olymp Trade",
  description: "Register for Olymp Trade through the NOJAI partner link and use bonus code NOJAI.",
  alternates: { canonical: "/partners/olymp-trade" },
  keywords: [
    "NOJAI Olymp Trade partner",
    "Olymp Trade registration link",
    "Olymp Trade bonus code",
    "Olymp Trade NOJAI",
  ],
  openGraph: {
    title: "NOJAI Partner - Olymp Trade",
    description: "Use the NOJAI Olymp Trade partner link and bonus code NOJAI.",
    url: "/partners/olymp-trade",
    images: [{ url: "/autobot-assets/olymptrade.jpeg", width: 1200, height: 630, alt: "Olymp Trade partner access" }],
  },
};

export default function OlympTradePartnerPage() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-20">
          <div>
            <Badge className="bg-emerald-500/15 text-emerald-300">Official Partner</Badge>
            <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              Start on Olymp Trade with NOJAI.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              Register through the NOJAI Olymp Trade partner link, use the bonus code, then return to your NOJAI dashboard to submit your Olymp details for access review.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-emerald-600 text-white hover:bg-emerald-500">
                <Link href={OLYMP_REGISTRATION_LINK} target="_blank" rel="noreferrer">
                  Register on Olymp
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/dashboard/affiliate">
                  Open dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-emerald-500/[0.04]">
            <div className="grid gap-0 sm:grid-cols-[0.95fr_1.05fr]">
              <div className="relative min-h-[280px] sm:min-h-[420px]">
                <Image
                  src="/autobot-assets/olymptrade.jpeg"
                  alt="Olymp Trade partner"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div className="flex flex-col justify-between p-6 sm:p-8">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">Registration link</p>
                  <Link
                    href={OLYMP_REGISTRATION_LINK}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block break-all text-lg font-semibold text-foreground underline decoration-emerald-400/50 underline-offset-4"
                  >
                    {OLYMP_REGISTRATION_LINK}
                  </Link>
                </div>

                <div className="mt-8 rounded-2xl border border-emerald-500/25 bg-black/20 p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                      <Gift className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Bonus code</p>
                      <p className="mt-1 font-display text-3xl font-black text-emerald-300">{OLYMP_BONUS_CODE}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: ExternalLink,
              title: "Register with the link",
              copy: "Create your Olymp Trade account using the NOJAI partner registration link.",
            },
            {
              icon: Sparkles,
              title: "Use bonus code NOJAI",
              copy: "Enter the bonus code exactly as shown so your setup follows the partner flow.",
            },
            {
              icon: ShieldCheck,
              title: "Submit for review",
              copy: "After registering, submit your Olymp email and account ID from your NOJAI dashboard.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="h-full rounded-[1.25rem] border-emerald-500/15 bg-white/[0.03]">
                <CardContent className="p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-5 text-lg font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.copy}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-300">Ready after registration?</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Log in to NOJAI and send your Olymp Trade account details for admin approval. Once approved, Olymp Trade access will appear in your dashboard.
              </p>
            </div>
            <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-500">
              <Link href="/auth/register">
                Create NOJAI account
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
