"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Lock,
  MonitorSmartphone,
  PercentCircle,
  TrendingUp,
  Zap,
  Loader2,
  Wallet,
} from "lucide-react";
import { useDashboardSocket } from "@/hooks/use-dashboard-socket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BalanceChart } from "@/components/dashboard/balance-chart";
import { ReviewGrowthPopup } from "@/components/dashboard/review-growth-popup";
import { NotificationPermissionPrompt } from "@/components/dashboard/notification-permission-prompt";
import { api, normalizeUserProfile } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency, formatCurrencyBreakdown, formatDate, formatSignedCurrency } from "@/lib/utils";
import type { EOAccount, UserProfile } from "@/types";

interface BotStatusResponse {
  subscriptionActive: boolean;
  plan: string | null;
  expiresAt: string | null;
  bot: { name: string; slug: string; status: string } | null;
  iqAccount: {
    email: string; balance: number; tradeAmount: number; martingaleEnabled: boolean;
    accountType: string; currency: string; lastConnected: string;
  } | null;
  iqAccounts?: Array<{
    email: string; balance: number; tradeAmount: number; martingaleEnabled: boolean;
    accountType: string; currency: string; lastConnected: string; connected?: boolean;
  }>;
}

interface ReturnsAccount {
  accountEmail?: string;
  broker?: string;
  currency: string;
  totalProfit: number;
  totalInvested: number;
  grossWinnings: number;
  grossLosses: number;
  wonCount: number;
  lostCount: number;
  totalTrades: number;
  winRate: number;
  isProfitable: boolean;
}
interface ReturnsResponse {
  totalProfit: number;
  netProfit?: number;
  tradeNetProfit?: number;
  balanceProfit?: number | null;
  startingBalance?: number | null;
  currentBalance?: number | null;
  profitBasis?: "balance" | "trades";
  completedCycles?: number;
  recoveredCycles?: number;
  openCycles?: number;
  recoveryRate?: number;
  totalInvested: number;
  grossWinnings: number;
  grossLosses: number;
  totalTrades: number;
  wonCount: number;
  lostCount: number;
  winRate: number;
  isProfitable: boolean;
  byAccount: ReturnsAccount[];
}

interface DashboardOverviewProps {
  welcome?: string;
  selectedPlan?: string;
  status?: string;
}

export function DashboardOverview({ welcome, selectedPlan, status }: DashboardOverviewProps) {
  const queryClient = useQueryClient();
  const [activeBroker, setActiveBroker] = useState<"iq" | "eo">("iq");

  const { data: profile } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => normalizeUserProfile((await api.get("/user/profile")).data) as UserProfile | null,
  });

  const { data: botStatus } = useQuery({
    queryKey: queryKeys.botStatus,
    queryFn: async () => (await api.get("/user/bot-status")).data as BotStatusResponse,
  });

  const hasSubscription = botStatus?.subscriptionActive ?? Boolean(profile?.subscription?.active);
  const activePlan = botStatus?.plan?.toUpperCase() ?? (profile?.subscription?.active ? profile?.subscription?.plan : "NONE");

  // Always fetch broker-specific returns separately — never mix
  const { data: iqReturns } = useQuery<ReturnsResponse>({
    queryKey: ["user-returns", "iq"],
    queryFn: async () => (await api.get("/user/returns?broker=iq")).data as ReturnsResponse,
    enabled: hasSubscription,
  });

  const { data: eoReturns } = useQuery<ReturnsResponse>({
    queryKey: ["user-returns", "eo"],
    queryFn: async () => (await api.get("/user/returns?broker=eo")).data as ReturnsResponse,
    enabled: hasSubscription,
  });

  // Today-only stats (refresh every 60s)
  const { data: iqTodayRaw } = useQuery<ReturnsResponse>({
    queryKey: ["user-returns-today", "iq"],
    queryFn: async () => (await api.get("/user/returns?broker=iq&period=today")).data as ReturnsResponse,
    enabled: hasSubscription,
    refetchInterval: 60_000,
  });

  const { data: eoTodayRaw } = useQuery<ReturnsResponse>({
    queryKey: ["user-returns-today", "eo"],
    queryFn: async () => (await api.get("/user/returns?broker=eo&period=today")).data as ReturnsResponse,
    enabled: hasSubscription,
    refetchInterval: 60_000,
  });

  const iqToday = iqTodayRaw as ReturnsResponse;
  const eoToday = eoTodayRaw as ReturnsResponse;



  const { data: eoAccountsList } = useQuery({
    queryKey: queryKeys.eoAccounts,
    queryFn: async () => {
      const res = await api.get("/user/eo-accounts");
      const raw = res.data?.accounts ?? res.data;
      return (Array.isArray(raw) ? raw : []) as EOAccount[];
    },
    enabled: hasSubscription,
  });

  useEffect(() => {
    if (status === "success") {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      queryClient.invalidateQueries({ queryKey: queryKeys.botStatus });
    }
  }, [status, queryClient]);

  // IQ Option computed
  const connectedAccounts = botStatus?.iqAccounts ?? (botStatus?.iqAccount ? [botStatus.iqAccount] : []);
  const hasIq = connectedAccounts.length > 0;
  const iqAccount = connectedAccounts[0] ?? botStatus?.iqAccount;
  const botInfo = botStatus?.bot;
  const balanceSummary = hasIq
    ? formatCurrencyBreakdown(connectedAccounts.map((a) => ({ currency: a.currency, amount: a.balance })))
    : null;

  // Fixed growth calc: require positive net + meaningful trades + winning rate
  const iqGrowthPercent = (() => {
    if (!hasIq || !iqReturns) return 0;
    const totalProfit = iqReturns.balanceProfit ?? iqReturns.totalProfit;
    const startingBalance = iqReturns.startingBalance ?? 0;
    if (startingBalance <= 0) return 0;
    return (totalProfit / startingBalance) * 100;
  })();

  // Expert Option computed
  const connectedEoAccounts = Array.isArray(eoAccountsList) ? eoAccountsList.filter((a) => a.status === "connected") : [];
  const hasEo = connectedEoAccounts.length > 0;
  const eoDemoBalance = connectedEoAccounts.reduce((sum, a) => sum + (a.demoBalance ?? 0), 0);
  const eoRealBalance = connectedEoAccounts.reduce((sum, a) => sum + (a.realBalance ?? 0), 0);
  const eoCurrency = connectedEoAccounts[0]?.currency ?? "USD";

  const eoGrowthPercent = (() => {
    if (!hasEo || !eoReturns) return 0;
    const totalProfit = eoReturns.balanceProfit ?? eoReturns.totalProfit;
    const startingBalance = eoReturns.startingBalance ?? 0;
    if (startingBalance <= 0) return 0;
    return (totalProfit / startingBalance) * 100;
  })();

  const growthPercent = activeBroker === "eo" ? eoGrowthPercent : iqGrowthPercent;
  const nextPlan = String(selectedPlan ?? "").trim().toUpperCase();
  const { isConnected } = useDashboardSocket();

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Dashboard</h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {hasSubscription ? "Your trading overview." : "Finish setup to start trading."}
          </p>
        </div>
        {!isConnected && hasSubscription && (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-bold text-amber-500 ring-1 ring-amber-500/20">
            <Loader2 className="h-3 w-3 animate-spin" /> Reconnecting&hellip;
          </div>
        )}
      </div>

      {hasSubscription && <NotificationPermissionPrompt />}

      {/* Payment banners */}
      {status === "success" && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-sm font-medium text-emerald-300">
          Payment completed successfully. Your dashboard is ready.
        </div>
      )}
      {status === "cancelled" && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm font-medium text-amber-300">
          Payment was cancelled. You can try again from the subscription page.
        </div>
      )}

      {/* Onboarding banner */}
      {!hasSubscription && (
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.08] to-transparent p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold sm:text-lg">
                {welcome ? "Welcome to NOJAI" : "Finish setup"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Activate a plan to use the dashboard.
                {nextPlan ? <> Selected: <span className="font-medium text-foreground">{nextPlan}</span></> : null}
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

      {/* Broker switcher tabs */}
      {hasSubscription && (
        <div className="dashboard-solid-panel flex gap-1.5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1.5">
          <button
            onClick={() => setActiveBroker("iq")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
              activeBroker === "iq"
                ? "bg-[#ff7803] text-white shadow-sm ring-1 ring-[#ff7803]/25"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Image src="/autobot-assets/iq-option-small.svg" alt="IQ Option" width={18} height={18} className="h-4 w-4 shrink-0 object-contain" />
            <span>IQ Option</span>
            {hasIq && (
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                {connectedAccounts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveBroker("eo")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
              activeBroker === "eo"
                ? "bg-[#1565c0] text-white shadow-sm ring-1 ring-[#1565c0]/25"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Image src="/autobot-assets/experoptionlogo.png" alt="ExpertOption" width={18} height={18} className="h-4 w-4 shrink-0 object-contain" />
            <span>ExpertOption</span>
            {hasEo && (
              <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">
                {connectedEoAccounts.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* IQ OPTION section */}
      {(activeBroker === "iq" || !hasSubscription) && (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <div className="dashboard-solid-panel rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wider text-blue-300/70 sm:text-[11px]">Plan</p>
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 sm:h-7 sm:w-7">
                  <CreditCard className="h-3 w-3 text-blue-400 sm:h-3.5 sm:w-3.5" />
                </div>
              </div>
              <p className="mt-2 font-display text-base font-semibold sm:mt-3 sm:text-2xl">{activePlan === "NONE" ? "—" : activePlan}</p>
              <p className="mt-0.5 text-[10px] text-blue-300/50 sm:mt-1 sm:text-xs">
                {hasSubscription ? `Expires ${formatDate(botStatus?.expiresAt ?? profile?.subscription?.expiresAt)}` : "No active plan"}
              </p>
            </div>
            <div className="dashboard-solid-panel rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-300/70 sm:text-[11px]">IQ Accounts</p>
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 sm:h-7 sm:w-7">
                  <MonitorSmartphone className="h-3 w-3 text-emerald-400 sm:h-3.5 sm:w-3.5" />
                </div>
              </div>
              <p className="mt-2 font-display text-base font-semibold sm:mt-3 sm:text-2xl">
                {hasIq ? `${connectedAccounts.length} Active` : "—"}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-emerald-300/50 sm:mt-1 sm:text-xs">
                {hasIq ? connectedAccounts.map((a) => a.email).join(", ") : "No broker linked"}
              </p>
            </div>
            <div className="dashboard-solid-panel rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wider text-violet-300/70 sm:text-[11px]">Balance</p>
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/20 sm:h-7 sm:w-7">
                  <TrendingUp className="h-3 w-3 text-violet-400 sm:h-3.5 sm:w-3.5" />
                </div>
              </div>
              <p className="mt-2 font-display text-base font-semibold sm:mt-3 sm:text-2xl">
                {hasIq ? balanceSummary : "—"}
              </p>
              <p className="mt-0.5 text-[10px] text-violet-300/50 sm:mt-1 sm:text-xs">
                {hasIq
                  ? connectedAccounts.length === 1
                    ? (iqAccount?.accountType === "REAL" ? "Real account" : "Practice account")
                    : "Combined total"
                  : "Connect broker first"}
              </p>
            </div>
            <div className="dashboard-solid-panel rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wider text-amber-300/70 sm:text-[11px]">Bot</p>
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 sm:h-7 sm:w-7">
                  <Zap className="h-3 w-3 text-amber-400 sm:h-3.5 sm:w-3.5" />
                </div>
              </div>
              <p className="mt-2 font-display text-base font-semibold sm:mt-3 sm:text-2xl">
                {botInfo?.status === "active" && hasIq ? "Active" : "Offline"}
              </p>
              <p className="mt-0.5 text-[10px] text-amber-300/50 sm:mt-1 sm:text-xs">
                {botInfo ? botInfo.name : "Setup required"}
              </p>
            </div>
            <div className="dashboard-solid-panel col-span-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 xl:col-span-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wider text-rose-300/70 sm:text-[11px]">IQ Returns</p>
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/20 sm:h-7 sm:w-7">
                  <PercentCircle className="h-3 w-3 text-rose-400 sm:h-3.5 sm:w-3.5" />
                </div>
              </div>
              <p className="mt-2 font-display text-base font-semibold sm:mt-3 sm:text-2xl">
                {iqReturns ? `${iqReturns.winRate}% win` : "—"}
              </p>
              <p className="mt-0.5 text-[10px] text-rose-300/50 sm:mt-1 sm:text-xs">
                {iqReturns ? `${iqReturns.wonCount}W / ${iqReturns.lostCount}L · ${iqReturns.totalTrades} trades` : "No closed trades yet"}
              </p>
              {iqReturns && (iqReturns.byAccount || []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {(iqReturns.byAccount || []).map((entry, idx) => (
                    <span key={entry.accountEmail ?? `${entry.currency}-${idx}`} className={`text-[10px] font-semibold ${entry.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatSignedCurrency(entry.totalProfit, entry.currency)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Today's IQ statistics */}
          {iqToday && false && iqToday.totalTrades > 0 && (
            <div className={`rounded-2xl border p-4 ${
              iqToday.isProfitable
                ? "border-emerald-500/20 bg-emerald-500/[0.06]"
                : "border-red-500/20 bg-red-500/[0.06]"
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider sm:text-[11px] ${
                    iqToday.isProfitable ? "text-emerald-300/70" : "text-red-300/70"
                  }`}>Today's IQ Performance</p>
                  <p className={`mt-1 font-display text-2xl font-bold sm:text-3xl ${
                    iqToday.isProfitable ? "text-emerald-300" : "text-red-400"
                  }`}>
                    {iqToday.totalProfit >= 0 ? "+" : ""}{iqToday.totalProfit.toFixed(2)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-3 text-[10px] sm:text-xs">
                    <span className="text-muted-foreground">Basis: <span className="font-medium text-foreground">{iqToday.profitBasis === "balance" ? "balance" : "closed trades"}</span></span>
                    <span className="text-emerald-400 font-semibold">Gross wins: +{iqToday.grossWinnings.toFixed(2)}</span>
                    <span className="text-red-400 font-semibold">Loss stake: -{iqToday.grossLosses.toFixed(2)}</span>
                    <span className="text-muted-foreground">Trade net: <span className="font-medium text-foreground">{(iqToday.tradeNetProfit ?? iqToday.totalProfit).toFixed(2)}</span></span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${
                    iqToday.isProfitable ? "text-emerald-300/60" : "text-red-300/60"
                  }`}>{iqToday.startingBalance ? "Account Growth" : "Trade ROI"}</p>
                  <p className={`font-display text-xl font-bold ${
                    iqToday.isProfitable ? "text-emerald-300" : "text-red-400"
                  }`}>
                    {iqToday.startingBalance
                      ? `${((iqToday.totalProfit / iqToday.startingBalance!) * 100).toFixed(1)}%`
                      : iqToday.totalInvested > 0
                      ? `${(((iqToday.tradeNetProfit ?? iqToday.totalProfit) / iqToday.totalInvested) * 100).toFixed(1)}%`
                      : "—"}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{iqToday.winRate}% win · {iqToday.recoveryRate ?? 0}% recovery · {iqToday.totalTrades} trades</p>
                </div>
              </div>

              {/* Per-account today breakdown */}
              {(iqToday.byAccount || []).filter((a) => a.accountEmail).length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="pb-1.5 text-left font-medium">Account</th>
                        <th className="pb-1.5 text-right font-medium">Currency</th>
                        <th className="pb-1.5 text-right font-medium">Today Profit</th>
                        <th className="pb-1.5 text-right font-medium">Win Rate</th>
                        <th className="pb-1.5 text-right font-medium">Trades</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {(iqToday.byAccount || []).filter((a) => a.accountEmail).map((acc) => (
                        <tr key={acc.accountEmail ?? acc.currency}>
                          <td className="py-1.5 pr-2 font-medium text-foreground truncate max-w-[120px]">{acc.accountEmail}</td>
                          <td className="py-1.5 text-right text-muted-foreground">{acc.currency}</td>
                          <td className={`py-1.5 text-right font-semibold ${acc.isProfitable ? "text-emerald-400" : "text-red-400"}`}>
                            {acc.totalProfit >= 0 ? "+" : ""}{acc.totalProfit.toFixed(2)}
                          </td>
                          <td className="py-1.5 text-right text-muted-foreground">{acc.winRate}%</td>
                          <td className="py-1.5 text-right text-muted-foreground">{acc.totalTrades}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {hasIq && (
            <div className="dashboard-solid-panel rounded-3xl border border-[#ff7803]/25 bg-white/[0.03] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Image src="/autobot-assets/iq-option-small.svg" alt="IQ Option" width={20} height={20} className="h-5 w-5 object-contain" />
                    <h3 className="font-display text-base font-bold sm:text-lg">IQ Option Accounts</h3>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Live balances, account mode, and trade settings.</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white">{connectedAccounts.length} Active</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {connectedAccounts.map((account) => (
                  <div key={`${account.email}-${account.accountType}`} className="dashboard-solid-panel rounded-2xl border border-[#ff7803]/20 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-bold sm:text-base">{account.email}</p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">{account.accountType} account</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${account.accountType === "REAL" ? "bg-emerald-500 text-white" : "bg-slate-600 text-white"}`}>
                        {account.accountType}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="dashboard-solid-panel rounded-xl border border-violet-500/20 bg-violet-500/10 p-2.5 ring-1 ring-violet-500/20 sm:p-3">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-violet-300/70 sm:text-[10px]">Balance</p>
                        <p className="mt-1 font-display text-base font-bold text-violet-100 sm:text-lg">{formatCurrency(account.balance ?? 0, account.currency)}</p>
                      </div>
                      <div className="dashboard-solid-panel rounded-xl border border-blue-500/20 bg-blue-500/10 p-2.5 ring-1 ring-blue-500/20 sm:p-3">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-blue-300/70 sm:text-[10px]">Trade Amount</p>
                        <p className="mt-1 font-display text-base font-bold text-blue-100 sm:text-lg">{formatCurrency(account.tradeAmount, account.currency)}</p>
                      </div>
                      <div className={`dashboard-solid-panel rounded-xl border p-2.5 ring-1 sm:p-3 ${account.martingaleEnabled ? "border-amber-500/20 bg-amber-500/10 ring-amber-500/20" : "border-white/[0.04] bg-white/[0.04] ring-white/10"}`}>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[10px]">Martingale</p>
                        <p className={`mt-1 text-sm font-bold ${account.martingaleEnabled ? "text-amber-300" : "text-muted-foreground"}`}>{account.martingaleEnabled ? "Enabled" : "Disabled"}</p>
                      </div>
                      <div className="dashboard-solid-panel rounded-xl border border-white/[0.04] bg-white/[0.04] p-2.5 ring-1 ring-white/10 sm:p-3">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[10px]">Last Sync</p>
                        <p className="mt-1 text-xs font-semibold sm:text-sm">{formatDate(account.lastConnected)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button asChild variant="outline" size="sm" className="mt-3 w-full sm:w-auto">
                <Link href="/dashboard/accounts?broker=iq">Manage IQ accounts <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
              </Button>
            </div>
          )}
        </>
      )}

      {/* EXPERT OPTION section — paid users only */}
      {activeBroker === "eo" && !hasSubscription && (
        <div className="rounded-3xl border border-amber-500/[0.15] bg-amber-500/[0.04] p-6 text-center sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20">
            <Lock className="h-6 w-6 text-amber-400" />
          </div>
          <h3 className="mt-4 font-display text-base font-bold sm:text-lg">Subscription Required</h3>
          <p className="mt-2 text-sm text-muted-foreground">Expert Option integration is available on all paid plans. Upgrade to access EO accounts, balances, and analytics.</p>
          <Button asChild className="mt-5">
            <Link href="/dashboard/subscription">View Plans <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      )}

      {activeBroker === "eo" && hasSubscription && (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <div className="dashboard-solid-panel rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wider text-blue-300/70 sm:text-[11px]">Plan</p>
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 sm:h-7 sm:w-7">
                  <CreditCard className="h-3 w-3 text-blue-400 sm:h-3.5 sm:w-3.5" />
                </div>
              </div>
              <p className="mt-2 font-display text-base font-semibold sm:mt-3 sm:text-2xl">{activePlan === "NONE" ? "—" : activePlan}</p>
              <p className="mt-0.5 text-[10px] text-blue-300/50 sm:mt-1 sm:text-xs">
                {hasSubscription ? `Expires ${formatDate(botStatus?.expiresAt ?? profile?.subscription?.expiresAt)}` : "No active plan"}
              </p>
            </div>
            <div className="dashboard-solid-panel rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wider text-cyan-300/70 sm:text-[11px]">EO Accounts</p>
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/20 sm:h-7 sm:w-7">
                  <MonitorSmartphone className="h-3 w-3 text-cyan-400 sm:h-3.5 sm:w-3.5" />
                </div>
              </div>
              <p className="mt-2 font-display text-base font-semibold sm:mt-3 sm:text-2xl">
                {hasEo ? `${connectedEoAccounts.length} Active` : "—"}
              </p>
              <p className="mt-0.5 text-[10px] text-cyan-300/50 sm:mt-1 sm:text-xs">
                {hasEo ? `${connectedEoAccounts.length} connected` : "No EO account linked"}
              </p>
            </div>
            <div className="dashboard-solid-panel rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-300/70 sm:text-[11px]">Real Balance</p>
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 sm:h-7 sm:w-7">
                  <Wallet className="h-3 w-3 text-emerald-400 sm:h-3.5 sm:w-3.5" />
                </div>
              </div>
              <p className="mt-2 font-display text-base font-semibold sm:mt-3 sm:text-2xl">
                {hasEo ? formatCurrency(eoRealBalance, eoCurrency) : "—"}
              </p>
              <p className="mt-0.5 text-[10px] text-emerald-300/50 sm:mt-1 sm:text-xs">Live account balance</p>
            </div>
            <div className="dashboard-solid-panel rounded-2xl border border-slate-500/20 bg-slate-500/10 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-300/70 sm:text-[11px]">Demo Balance</p>
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-500/20 sm:h-7 sm:w-7">
                  <TrendingUp className="h-3 w-3 text-slate-400 sm:h-3.5 sm:w-3.5" />
                </div>
              </div>
              <p className="mt-2 font-display text-base font-semibold sm:mt-3 sm:text-2xl">
                {hasEo ? formatCurrency(eoDemoBalance, eoCurrency) : "—"}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-300/50 sm:mt-1 sm:text-xs">Practice account balance</p>
            </div>
            <div className="dashboard-solid-panel col-span-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 xl:col-span-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wider text-rose-300/70 sm:text-[11px]">EO Returns</p>
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/20 sm:h-7 sm:w-7">
                  <PercentCircle className="h-3 w-3 text-rose-400 sm:h-3.5 sm:w-3.5" />
                </div>
              </div>
              <p className="mt-2 font-display text-base font-semibold sm:mt-3 sm:text-2xl">
                {eoReturns ? `${eoReturns.winRate}% win` : "—"}
              </p>
              <p className="mt-0.5 text-[10px] text-rose-300/50 sm:mt-1 sm:text-xs">
                {eoReturns ? `${eoReturns.wonCount}W / ${eoReturns.lostCount}L · ${eoReturns.totalTrades} trades` : "No EO trades yet"}
              </p>
              {eoReturns && (eoReturns.byAccount || []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {(eoReturns.byAccount || []).map((entry, idx) => (
                    <span key={entry.accountEmail ?? `${entry.currency}-${idx}`} className={`text-[10px] font-semibold ${entry.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatSignedCurrency(entry.totalProfit, entry.currency)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Today's EO statistics */}
          {eoToday && false && eoToday.totalTrades > 0 && (
            <div className={`rounded-2xl border p-4 ${
              eoToday.isProfitable
                ? "border-emerald-500/20 bg-emerald-500/[0.06]"
                : "border-red-500/20 bg-red-500/[0.06]"
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider sm:text-[11px] ${
                    eoToday.isProfitable ? "text-emerald-300/70" : "text-red-300/70"
                  }`}>Today's EO Performance</p>
                  <p className={`mt-1 font-display text-2xl font-bold sm:text-3xl ${
                    eoToday.isProfitable ? "text-emerald-300" : "text-red-400"
                  }`}>
                    {eoToday.totalProfit >= 0 ? "+" : ""}{eoToday.totalProfit.toFixed(2)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-3 text-[10px] sm:text-xs">
                    <span className="text-muted-foreground">Basis: <span className="font-medium text-foreground">{eoToday.profitBasis === "balance" ? "balance" : "closed trades"}</span></span>
                    <span className="text-emerald-400 font-semibold">Gross wins: +{eoToday.grossWinnings.toFixed(2)}</span>
                    <span className="text-red-400 font-semibold">Loss stake: -{eoToday.grossLosses.toFixed(2)}</span>
                    <span className="text-muted-foreground">Trade net: <span className="font-medium text-foreground">{(eoToday.tradeNetProfit ?? eoToday.totalProfit).toFixed(2)}</span></span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${
                    eoToday.isProfitable ? "text-emerald-300/60" : "text-red-300/60"
                  }`}>{eoToday.startingBalance ? "Account Growth" : "Trade ROI"}</p>
                  <p className={`font-display text-xl font-bold ${
                    eoToday.isProfitable ? "text-emerald-300" : "text-red-400"
                  }`}>
                    {eoToday.startingBalance
                      ? `${((eoToday.totalProfit / eoToday.startingBalance!) * 100).toFixed(1)}%`
                      : eoToday.totalInvested > 0
                      ? `${(((eoToday.tradeNetProfit ?? eoToday.totalProfit) / eoToday.totalInvested) * 100).toFixed(1)}%`
                      : "—"}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{eoToday.winRate}% win · {eoToday.recoveryRate ?? 0}% recovery · {eoToday.totalTrades} trades</p>
                </div>
              </div>

              {/* Per-account today breakdown */}
              {(eoToday.byAccount || []).filter((a) => a.accountEmail).length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="pb-1.5 text-left font-medium">Account</th>
                        <th className="pb-1.5 text-right font-medium">Currency</th>
                        <th className="pb-1.5 text-right font-medium">Today Profit</th>
                        <th className="pb-1.5 text-right font-medium">Win Rate</th>
                        <th className="pb-1.5 text-right font-medium">Trades</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {(eoToday.byAccount || []).filter((a) => a.accountEmail).map((acc) => (
                        <tr key={acc.accountEmail ?? acc.currency}>
                          <td className="py-1.5 pr-2 font-medium text-foreground truncate max-w-[120px]">{acc.accountEmail}</td>
                          <td className="py-1.5 text-right text-muted-foreground">{acc.currency}</td>
                          <td className={`py-1.5 text-right font-semibold ${acc.isProfitable ? "text-emerald-400" : "text-red-400"}`}>
                            {acc.totalProfit >= 0 ? "+" : ""}{acc.totalProfit.toFixed(2)}
                          </td>
                          <td className="py-1.5 text-right text-muted-foreground">{acc.winRate}%</td>
                          <td className="py-1.5 text-right text-muted-foreground">{acc.totalTrades}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {hasEo ? (
            <div className="dashboard-solid-panel rounded-3xl border border-[#1565c0]/25 bg-blue-500/[0.03] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Image src="/autobot-assets/experoptionlogo.png" alt="ExpertOption" width={20} height={20} className="h-5 w-5 object-contain" />
                    <h3 className="font-display text-base font-bold sm:text-lg">ExpertOption Accounts</h3>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Demo &amp; real balances, trade amount, and profit analytics.</p>
                </div>
                <span className="shrink-0 rounded-full bg-blue-500 px-2.5 py-1 text-[10px] font-bold text-white">{connectedEoAccounts.length} Active</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {connectedEoAccounts.map((account) => (
                  <div key={account.accountId} className="dashboard-solid-panel rounded-2xl border border-[#1565c0]/20 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-display text-sm font-bold sm:text-base">{account.name || `Account #${account.accountId}`}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">ID: {account.accountId}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">Connected</span>
                        {account.isMain && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">Main</span>}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="dashboard-solid-panel rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 ring-1 ring-emerald-500/20 sm:p-3">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-300/70 sm:text-[10px]">Real Balance</p>
                        <p className="mt-1 font-display text-base font-bold text-emerald-100 sm:text-lg">{formatCurrency(account.realBalance ?? 0, account.currency ?? "USD")}</p>
                      </div>
                      <div className="dashboard-solid-panel rounded-xl border border-slate-500/20 bg-slate-500/10 p-2.5 ring-1 ring-slate-500/20 sm:p-3">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-300/70 sm:text-[10px]">Demo Balance</p>
                        <p className="mt-1 font-display text-base font-bold text-slate-100 sm:text-lg">{formatCurrency(account.demoBalance ?? 0, account.currency ?? "USD")}</p>
                      </div>
                      <div className="dashboard-solid-panel rounded-xl border border-blue-500/20 bg-blue-500/10 p-2.5 ring-1 ring-blue-500/20 sm:p-3">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-blue-300/70 sm:text-[10px]">Trade Amount</p>
                        <p className="mt-1 font-display text-base font-bold text-blue-100 sm:text-lg">{formatCurrency(account.baseAmount, account.currency ?? "USD")}</p>
                      </div>
                      <div className="dashboard-solid-panel rounded-xl border border-white/[0.04] bg-white/[0.04] p-2.5 ring-1 ring-white/10 sm:p-3">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[10px]">Last Sync</p>
                        <p className="mt-1 text-xs font-semibold sm:text-sm">{formatDate(account.lastConnected)}</p>
                      </div>
                    </div>
                    {eoReturns && eoReturns.totalTrades > 0 && (
                      <div className="dashboard-solid-panel mt-3 rounded-xl border border-white/[0.04] bg-white/[0.03] p-2.5 ring-1 ring-white/[0.06]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-muted-foreground">Net profit (all EO trades)</span>
                          <span className={`text-xs font-bold ${eoReturns.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {formatSignedCurrency(eoReturns.totalProfit, account.currency ?? "USD")}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${Math.min(eoReturns.winRate, 100)}%` }} />
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground">{eoReturns.winRate}% win rate · {eoReturns.totalTrades} trades</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Button asChild variant="outline" size="sm" className="mt-3 w-full sm:w-auto">
                <Link href="/dashboard/accounts?broker=eo">Manage EO accounts <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-3xl border border-blue-500/[0.12] bg-blue-500/[0.03] p-6 text-center sm:p-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white p-2">
                <Image src="/autobot-assets/experoptionlogo.png" alt="ExpertOption" width={44} height={44} className="h-10 w-10 object-contain" />
              </div>
              <h3 className="mt-4 font-display text-base font-bold sm:text-lg">Connect ExpertOption</h3>
              <p className="mt-2 text-sm text-muted-foreground">Link your Expert Option account to start automated trading and see live balances here.</p>
              <Button asChild className="mt-5" style={{ background: "#1565C0" }}>
                <Link href="/dashboard/accounts?broker=eo">Connect ExpertOption <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          )}
        </>
      )}

      {/* Broker + Plan cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold sm:text-base">Broker Connection</h3>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${hasIq || hasEo ? "bg-emerald-500 text-white" : "bg-amber-500/80 text-white"}`}>
              {hasIq || hasEo ? "Connected" : "Pending"}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 sm:h-10 sm:w-10">
                <Image src="/autobot-assets/iq-option-small.svg" alt="IQ Option" width={32} height={32} className="h-7 w-7 object-contain sm:h-8 sm:w-8" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">IQ Option</p>
                  <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">Active</span>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {hasIq ? `${connectedAccounts.length} account${connectedAccounts.length > 1 ? "s" : ""} connected` : "Primary broker"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 sm:h-10 sm:w-10">
                <Image src="/autobot-assets/experoptionlogo.png" alt="ExpertOption" width={32} height={32} className="h-7 w-7 object-contain sm:h-8 sm:w-8" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">ExpertOption</p>
                  <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">Active</span>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {hasEo ? `${connectedEoAccounts.length} account${connectedEoAccounts.length > 1 ? "s" : ""} connected` : "Online trading platform"}
                </p>
              </div>
              {!hasEo && (
                <Button asChild size="sm" variant="outline" className="shrink-0 text-xs h-7 px-2">
                  <Link href="/dashboard/accounts?broker=eo">Connect</Link>
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 opacity-40">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 sm:h-10 sm:w-10">
                <Image src="/autobot-assets/pocket-option.svg" alt="Pocket Option" width={32} height={32} className="h-7 w-7 object-contain sm:h-8 sm:w-8" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Pocket Option</p>
                  <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-white/60">Soon</span>
                </div>
              </div>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="mt-3 w-full sm:w-auto">
            <Link href="/dashboard/accounts">
              {hasIq || hasEo ? "Manage brokers" : "Connect broker"} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold sm:text-base">Trading Plan</h3>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${hasSubscription ? "bg-emerald-500 text-white" : "bg-amber-500/80 text-white"}`}>
              {hasSubscription ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {(hasSubscription
              ? activePlan === "VIP"
                ? ["IQ Option automation", "Expert Option automation", "Copy trading", "Webhook integrations", "Priority support"]
                : activePlan === "PRO"
                  ? ["IQ Option automation", "Expert Option automation", "Copy trading", "Expanded controls"]
                  : ["IQ Option automation", "Expert Option automation", "Basic dashboard access"]
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
              { label: "Broker Settings", href: "/dashboard/accounts", icon: MonitorSmartphone, bg: "bg-emerald-500/15", ring: "ring-emerald-500/25", text: "text-emerald-400" },
              { label: "Trade History", href: "/dashboard/trades", icon: TrendingUp, bg: "bg-violet-500/15", ring: "ring-violet-500/25", text: "text-violet-400" },
              { label: "Copy Trading", href: "/dashboard/copy-trading", icon: Zap, bg: "bg-amber-500/15", ring: "ring-amber-500/25", text: "text-amber-400" },
              { label: "Settings", href: "/dashboard/settings", icon: CreditCard, bg: "bg-blue-500/15", ring: "ring-blue-500/25", text: "text-blue-400" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 transition-all hover:bg-white/[0.06] hover:shadow-glow sm:gap-3 sm:p-4"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 sm:h-9 sm:w-9 ${action.bg} ${action.ring}`}>
                  <action.icon className={`h-4 w-4 ${action.text}`} />
                </div>
                <span className="text-xs font-semibold text-foreground sm:text-sm">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Balance chart — scoped to the active broker */}
      {hasSubscription && <BalanceChart broker={activeBroker} />}

      {/* Review popup — only fires when account is genuinely growing */}
      {hasSubscription && <ReviewGrowthPopup growthPercent={growthPercent} />}
    </div>
  );
}
