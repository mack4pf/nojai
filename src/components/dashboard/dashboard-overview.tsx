"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  MonitorSmartphone,
  PercentCircle,
  TrendingUp,
  Zap,
} from "lucide-react";


import { Button } from "@/components/ui/button";
import { BalanceChart } from "@/components/dashboard/balance-chart";
import { ReviewGrowthPopup } from "@/components/dashboard/review-growth-popup";
import { api, normalizeUserProfile } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency, formatCurrencyBreakdown, formatDate, formatSignedCurrency } from "@/lib/utils";
import type { UserProfile } from "@/types";

interface BotStatusResponse {
  subscriptionActive: boolean;
  plan: string | null;
  expiresAt: string | null;
  bot: { name: string; slug: string; status: string } | null;
  iqAccount: {
    email: string;
    balance: number;
    tradeAmount: number;
    martingaleEnabled: boolean;
    accountType: string;
    currency: string;
    lastConnected: string;
  } | null;
  iqAccounts?: Array<{
    email: string;
    balance: number;
    tradeAmount: number;
    martingaleEnabled: boolean;
    accountType: string;
    currency: string;
    lastConnected: string;
    connected?: boolean;
  }>;
}

interface DashboardOverviewProps {
  welcome?: string;
  selectedPlan?: string;
  status?: string;
}

export function DashboardOverview({ welcome, selectedPlan, status }: DashboardOverviewProps) {
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => normalizeUserProfile((await api.get("/user/profile")).data) as UserProfile | null,
  });

  const { data: botStatus } = useQuery({
    queryKey: queryKeys.botStatus,
    queryFn: async () => (await api.get("/user/bot-status")).data as BotStatusResponse,
  });

  interface ReturnsEntry { currency: string; totalProfit: number; wonCount: number; lostCount: number; totalTrades: number; winRate: number; }
  interface ReturnsResponse { totalTrades: number; wonCount: number; lostCount: number; winRate: number; byCurrency: ReturnsEntry[]; }
  const { data: returns } = useQuery({
    queryKey: ["user-returns"],
    queryFn: async () => (await api.get("/user/returns")).data as ReturnsResponse,
  });

  // On payment success, force a fresh fetch so the UI reflects the new subscription immediately.
  useEffect(() => {
    if (status === "success") {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      queryClient.invalidateQueries({ queryKey: queryKeys.botStatus });
    }
  }, [status, queryClient]);

  const hasSubscription = botStatus?.subscriptionActive ?? Boolean(profile?.subscription?.active);
  const activePlan = botStatus?.plan?.toUpperCase() ?? (profile?.subscription?.active ? profile?.subscription?.plan : "NONE");
  const connectedAccounts = botStatus?.iqAccounts ?? (botStatus?.iqAccount ? [botStatus.iqAccount] : []);
  const hasIq = connectedAccounts.length > 0;
  const iqAccount = connectedAccounts[0] ?? botStatus?.iqAccount;
  const botInfo = botStatus?.bot;
  const nextPlan = String(selectedPlan ?? "").trim().toUpperCase();
  const balanceSummary = hasIq
    ? formatCurrencyBreakdown(connectedAccounts.map((account) => ({ currency: account.currency, amount: account.balance })))
    : null;

  // Compute account growth from total profit vs starting balance
  const accountGrowthPercent = (() => {
    if (!hasIq || !returns) return 0;
    const totalProfit = returns.byCurrency.reduce((sum, e) => sum + e.totalProfit, 0);
    const currentBalance = connectedAccounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);
    const startingBalance = currentBalance - totalProfit;
    if (startingBalance <= 0 || totalProfit <= 0) return 0;
    return (totalProfit / startingBalance) * 100;
  })();

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Dashboard</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          {hasSubscription ? "Your trading overview." : "Finish setup to start trading."}
        </p>
      </div>

      {status === "success" ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-sm font-medium text-emerald-300">
          Payment completed successfully. Your dashboard is ready.
        </div>
      ) : null}
      {status === "cancelled" ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm font-medium text-amber-300">
          Payment was cancelled. You can try again from the subscription page.
        </div>
      ) : null}

      {/* Welcome / onboarding banner — only for users with no active plan */}
      {!hasSubscription && (
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.08] to-transparent p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold sm:text-lg">
                {welcome ? "Welcome to NOJAI" : "Finish setup"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Activate a plan to use the dashboard.
                {nextPlan ? <>{" "}Selected: <span className="font-medium text-foreground">{nextPlan}</span></> : null}
              </p>
            </div>
            <Button asChild size="sm" className="w-full sm:w-auto">
              <Link href={nextPlan ? `/dashboard/subscription?plan=${encodeURIComponent(nextPlan)}` : "/dashboard/subscription"}>
                Choose a plan <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wider text-blue-300/70">Plan</p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20">
              <CreditCard className="h-3.5 w-3.5 text-blue-400" />
            </div>
          </div>
          <p className="mt-2 font-display text-lg font-semibold sm:mt-3 sm:text-2xl">{activePlan === "NONE" ? "—" : activePlan}</p>
          <p className="mt-1 text-[11px] text-blue-300/50 sm:text-xs">
            {hasSubscription ? `Expires ${formatDate(botStatus?.expiresAt ?? profile?.subscription?.expiresAt)}` : "No active plan"}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-300/70">Broker</p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20">
              <MonitorSmartphone className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          </div>
          <p className="mt-2 font-display text-lg font-semibold sm:mt-3 sm:text-2xl">{hasIq ? `${connectedAccounts.length} Connected` : "—"}</p>
          <p className="mt-1 text-[11px] text-emerald-300/50 sm:text-xs">
            {hasIq ? connectedAccounts.map((account) => account.email).join(", ") : "No broker linked"}
          </p>
        </div>

        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wider text-violet-300/70">Balance</p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20">
              <TrendingUp className="h-3.5 w-3.5 text-violet-400" />
            </div>
          </div>
          <p className="mt-2 font-display text-lg font-semibold sm:mt-3 sm:text-2xl">
            {hasIq ? balanceSummary : "—"}
          </p>
          <p className="mt-1 text-[11px] text-violet-300/50 sm:text-xs">
            {hasIq
              ? connectedAccounts.length === 1
                ? (iqAccount?.accountType === "REAL" ? "Real account" : "Practice account")
                : "Combined across connected accounts"
              : "Connect broker first"}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wider text-amber-300/70">Bot</p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
            </div>
          </div>
          <p className="mt-2 font-display text-lg font-semibold sm:mt-3 sm:text-2xl">
            {botInfo?.status === "active" && hasIq ? "Active" : "Offline"}
          </p>
          <p className="mt-1 text-[11px] text-amber-300/50 sm:text-xs">
            {botInfo ? botInfo.name : "Setup required"}
          </p>
        </div>

        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 sm:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wider text-rose-300/70">Returns</p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20">
              <PercentCircle className="h-3.5 w-3.5 text-rose-400" />
            </div>
          </div>
          <p className="mt-2 font-display text-lg font-semibold sm:mt-3 sm:text-2xl">
            {returns ? `${returns.winRate}% win` : "—"}
          </p>
          <p className="mt-1 text-[11px] text-rose-300/50 sm:text-xs">
            {returns
              ? `${returns.wonCount}W / ${returns.lostCount}L · ${returns.totalTrades} trades`
              : "No closed trades yet"}
          </p>
          {returns && returns.byCurrency.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {returns.byCurrency.map((entry) => (
                <span key={entry.currency} className={`text-[10px] font-semibold ${entry.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatSignedCurrency(entry.totalProfit, entry.currency)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Connected accounts overview */}
      {hasIq && (
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold sm:text-lg">Connected IQ Accounts</h3>
              <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
                Live balances, account mode, and email for every connected broker account.
              </p>
            </div>
            <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white">{connectedAccounts.length} Active</span>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {connectedAccounts.map((account) => (
              <div key={`${account.email}-${account.accountType}`} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-bold">{account.email}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      {account.accountType} account
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                    account.accountType === "REAL"
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-600 text-white"
                  }`}>
                    {account.accountType}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-violet-500/10 p-3 ring-1 ring-violet-500/20">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/70">Balance</p>
                    <p className="mt-1 font-display text-lg font-bold text-violet-100">
                      {formatCurrency(account.balance ?? 0, account.currency)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-blue-500/10 p-3 ring-1 ring-blue-500/20">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300/70">Trade Amount</p>
                    <p className="mt-1 font-display text-lg font-bold text-blue-100">
                      {formatCurrency(account.tradeAmount, account.currency)}
                    </p>
                  </div>
                  <div className={`rounded-xl p-3 ring-1 ${
                    account.martingaleEnabled
                      ? "bg-amber-500/10 ring-amber-500/20"
                      : "bg-white/[0.04] ring-white/10"
                  }`}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Martingale</p>
                    <p className={`mt-1 text-sm font-bold ${
                      account.martingaleEnabled ? "text-amber-300" : "text-muted-foreground"
                    }`}>
                      {account.martingaleEnabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/10">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Last Sync</p>
                    <p className="mt-1 text-sm font-semibold">{formatDate(account.lastConnected)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-column: Broker + Plan — stacked on mobile */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Broker card */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold sm:text-base">Broker Connection</h3>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
              hasIq ? "bg-emerald-500 text-white" : "bg-amber-500/80 text-white"
            }`}>{hasIq ? "Connected" : "Pending"}</span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
                <Image src="/autobot-assets/iq-option-small.svg" alt="IQ Option" width={32} height={32} className="h-8 w-8 object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">IQ Option</p>
                  <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">Active</span>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {hasIq ? `${connectedAccounts.length} connected account${connectedAccounts.length > 1 ? "s" : ""}` : "Primary broker"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 opacity-40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
                <Image src="/autobot-assets/pocket-option.svg" alt="Pocket Option" width={32} height={32} className="h-8 w-8 object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Pocket Option</p>
                  <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-white/60">Soon</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 opacity-40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
                <Image src="/autobot-assets/expert-option.svg" alt="ExpertOption" width={32} height={32} className="h-8 w-8 object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">ExpertOption</p>
                  <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-white/60">Soon</span>
                </div>
              </div>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="mt-3 w-full sm:w-auto">
            <Link href="/dashboard/accounts">
              {hasIq ? "Manage broker" : "Connect broker"} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Plan card */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold sm:text-base">Trading Plan</h3>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
              hasSubscription ? "bg-emerald-500 text-white" : "bg-amber-500/80 text-white"
            }`}>{hasSubscription ? "Active" : "Inactive"}</span>
          </div>
          <div className="mt-3 space-y-2">
            {(hasSubscription
              ? activePlan === "VIP"
                ? ["IQ Option automation", "Copy trading", "Webhook integrations", "Priority support"]
                : activePlan === "PRO"
                  ? ["IQ Option automation", "Copy trading", "Expanded controls"]
                  : ["IQ Option automation", "Basic dashboard access"]
              : ["Choose a plan to get started"]
            ).map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${hasSubscription ? "text-primary" : "text-muted-foreground/30"}`} />
                <span>{f}</span>
              </div>
            ))}
          </div>
          <Button asChild variant="outline" size="sm" className="mt-3 w-full sm:w-auto">
            <Link href="/dashboard/subscription">
              {activePlan === "VIP" ? "Manage plan" : hasSubscription ? "Manage plan" : "View plans"} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick actions */}
      {hasSubscription && (
        <div>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {[
              { label: "Broker Settings", href: "/dashboard/accounts",      icon: MonitorSmartphone, bg: "bg-emerald-500/15", ring: "ring-emerald-500/25", text: "text-emerald-400" },
              { label: "Trade History",   href: "/dashboard/trades",         icon: TrendingUp,        bg: "bg-violet-500/15",  ring: "ring-violet-500/25",  text: "text-violet-400"  },
              { label: "Copy Trading",   href: "/dashboard/copy-trading",   icon: Zap,               bg: "bg-amber-500/15",   ring: "ring-amber-500/25",   text: "text-amber-400"   },
              { label: "Settings",       href: "/dashboard/settings",       icon: CreditCard,        bg: "bg-blue-500/15",    ring: "ring-blue-500/25",    text: "text-blue-400"    },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5 transition-all hover:bg-white/[0.06] hover:shadow-glow sm:p-4"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${action.bg} ${action.ring}`}>
                  <action.icon className={`h-4 w-4 ${action.text}`} />
                </div>
                <span className="text-xs font-semibold text-foreground sm:text-sm">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Balance / Profitability chart */}
      {hasSubscription && <BalanceChart />}

      {/* Account growth review prompt */}
      {hasSubscription && <ReviewGrowthPopup growthPercent={accountGrowthPercent} />}
    </div>
  );
}