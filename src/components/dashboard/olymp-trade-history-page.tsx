"use client";

import { TradesHistory } from "@/components/dashboard/trades-history";

export function OlympTradeHistoryPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Olymp Trade History</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Simple Olymp-only trade history for the free plan.
        </p>
      </div>
      <div className="dashboard-solid-panel rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
        <TradesHistory lockedBroker="olymp" hideHeader />
      </div>
    </div>
  );
}
