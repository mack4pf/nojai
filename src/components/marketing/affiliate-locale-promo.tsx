"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Gift, Sparkles } from "lucide-react";

type AffiliateLocale = {
  currency: "NGN" | "USD";
  rewardRange: string;
};

const fallback: AffiliateLocale = {
  currency: "USD",
  rewardRange: "$6 to $14",
};

export function AffiliateLocalePromo() {
  const [locale, setLocale] = useState<AffiliateLocale>(fallback);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/affiliate-locale", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : fallback))
      .then((data) => {
        if (cancelled) return;
        setLocale({
          currency: data?.currency === "NGN" ? "NGN" : "USD",
          rewardRange: typeof data?.rewardRange === "string" ? data.rewardRange : fallback.rewardRange,
        });
      })
      .catch(() => {
        if (!cancelled) setLocale(fallback);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const payoutText = locale.currency === "NGN"
    ? "Naira payouts for Nigerian referrals"
    : "USD payouts for international referrals";

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.08] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/10 text-emerald-500">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              NOJAI Affiliate
            </div>
            <p className="mt-2 text-base font-bold text-foreground sm:text-lg">
              Earn {locale.rewardRange} per friend
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {payoutText}. Share your link, your friend subscribes, and your reward is tracked automatically.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/affiliate"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-foreground px-4 py-2.5 text-sm font-bold text-background transition-colors hover:bg-foreground/90"
        >
          How it works
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
