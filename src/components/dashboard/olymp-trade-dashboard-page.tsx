"use client";

import { useQuery } from "@tanstack/react-query";

import { BalanceChart } from "@/components/dashboard/balance-chart";
import { OlympAccountsManager } from "@/components/dashboard/olymp-accounts-manager";
import { OlympFollowTrader } from "@/components/dashboard/olymp-follow-trader";
import { api, normalizeUserProfile } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency } from "@/lib/utils";
import type { UserProfile } from "@/types";

interface OlympReturns {
  totalTrades?: number;
  wonCount?: number;
  lostCount?: number;
  drawCount?: number;
  winRate?: number;
  netProfit?: number;
  totalProfit?: number;
  currentBalance?: number | null;
  profitBasis?: string;
  byAccount?: Array<{
    accountId: string;
    currency: string;
    currentBalance?: number | null;
    totalTrades?: number;
    winRate?: number;
    netProfit?: number;
  }>;
}

export function OlympTradeDashboardPage() {
  const { data: profile } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => normalizeUserProfile((await api.get("/user/profile")).data) as UserProfile | null,
  });

  const { data: partnerStatus } = useQuery<{ linked: boolean }>({
    queryKey: ["olymp-partner-status"],
    queryFn: async () => (await api.get("/olymp-partner/status")).data as { linked: boolean },
  });

  // Having connected an Olymp account is itself the qualification now.
  // This used to require a subscription or the free-tier approval flag, but
  // that flag could only ever be set by an admin approving a submission, and
  // submissions are gone — so a user who connected an account would have been
  // shown no stats at all, with no way left to earn them.
  const hasOlympDataAccess = Boolean(
    profile?.subscription?.active || profile?.olympTradeFreeAccess || partnerStatus?.linked,
  );
  const { data: returns } = useQuery<OlympReturns>({
    queryKey: ["olymp-trade-page-returns"],
    queryFn: async () => (await api.get("/user/returns?broker=olymp")).data as OlympReturns,
    enabled: hasOlympDataAccess,
  });

  const accountStats = returns?.byAccount ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Olymp Trade</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Connect your Olymp Trade account, and see everything the bot has traded for you.
        </p>
      </div>

      {hasOlympDataAccess && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Net Profit", value: formatCurrency(returns?.netProfit ?? returns?.totalProfit ?? 0, "USD") },
            { label: "Total Trades", value: String(returns?.totalTrades ?? 0) },
            { label: "Win Rate", value: `${returns?.winRate ?? 0}%` },
            { label: "Open Accounts", value: String(accountStats.length) },
          ].map((item) => (
            <div key={item.label} className="dashboard-solid-panel rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
              <p className="mt-1 font-display text-lg font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      <OlympFollowTrader />

      <OlympAccountsManager />

      {hasOlympDataAccess && <BalanceChart broker="olymp" />}
    </div>
  );
}
