"use client";

import { useQuery } from "@tanstack/react-query";

import { BalanceChart } from "@/components/dashboard/balance-chart";
import { OlympPartnerAccount } from "@/components/dashboard/olymp-partner-account";
import { TradesHistory } from "@/components/dashboard/trades-history";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface OlympReturns {
  totalTrades?: number;
  wonCount?: number;
  lostCount?: number;
  winRate?: number;
  netProfit?: number;
  totalProfit?: number;
}

interface OlympPartnerStatus {
  linked: boolean;
  accounts?: Array<{ id: number; type: "real" | "demo"; currency: string; balance: number }>;
}

/**
 * The Olymp subdomain's dashboard. Unlike the main site's Olymp page, this
 * deliberately has no "connect an existing account" flow — accounts here are
 * created through the Partner API, which is the only path that doesn't need
 * the user's broker password.
 */
export function OlympPartnerDashboardPage() {
  const { data: status } = useQuery<OlympPartnerStatus>({
    queryKey: ["olymp-partner-status"],
    queryFn: async () => (await api.get("/olymp-partner/status")).data as OlympPartnerStatus,
    refetchInterval: 60_000,
  });

  const { data: returns } = useQuery<OlympReturns>({
    queryKey: ["olymp-partner-returns"],
    queryFn: async () => (await api.get("/user/returns?broker=olymp")).data as OlympReturns,
    enabled: Boolean(status?.linked),
  });

  const realAccount = status?.accounts?.find((account) => account.type === "real");
  const hasTraded = (returns?.totalTrades ?? 0) > 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Olymp Trade</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Your account, balance, and everything the bot has traded for you.
        </p>
      </div>

      <OlympPartnerAccount />

      {status?.linked ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: "Balance",
                value: realAccount ? formatCurrency(realAccount.balance, realAccount.currency) : "—",
              },
              {
                label: "Net Profit",
                value: hasTraded
                  ? formatCurrency(returns?.netProfit ?? returns?.totalProfit ?? 0, realAccount?.currency ?? "USD")
                  : "—",
              },
              { label: "Total Trades", value: hasTraded ? String(returns?.totalTrades ?? 0) : "—" },
              { label: "Win Rate", value: hasTraded ? `${returns?.winRate ?? 0}%` : "—" },
            ].map((item) => (
              <div
                key={item.label}
                className="dashboard-solid-panel rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
                <p className="mt-1 font-display text-lg font-semibold">{item.value}</p>
              </div>
            ))}
          </div>

          {hasTraded ? (
            <>
              <BalanceChart broker="olymp" />
              <div className="dashboard-solid-panel rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
                <h2 className="font-display text-lg font-semibold tracking-tight">Recent trades</h2>
                <div className="mt-4">
                  <TradesHistory lockedBroker="olymp" hideHeader />
                </div>
              </div>
            </>
          ) : (
            <div className="dashboard-solid-panel rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
              <p className="font-display text-base font-semibold">No trades yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Once you&apos;ve deposited, the bot starts trading your account automatically and every trade
                shows up here.
              </p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
