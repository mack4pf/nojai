"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  Bell,
  Bot,
  Eye,
  EyeOff,
  Link2,
  Link2Off,
  Loader2,
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
  UserCheck,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import {
  clampTradeAmountToCurrency,
  formatCurrency,
  formatDate,
  getTradeAmountMinimum,
  getTradeAmountRequirement,
  supportedTradeCurrencies,
} from "@/lib/utils";

interface RevenueByCurrency {
  currency: "NGN" | "USD";
  total: number;
  thisMonth: number;
  last7Days: number;
  today: number;
  subscriptionCount: number;
}

interface ProfitByCurrency {
  currency: string;
  totalProfit: number;
  wonCount: number;
  lostCount: number;
  totalTrades: number;
  winRate: number;
}

interface BrokerTradeStats {
  totalTrades: number;
  todayTrades: number;
  wonCount: number;
  lostCount: number;
  totalProfit: number;
  totalInvested: number;
}

interface ConnectedAccountsByCurrency {
  currency: string;
  userCount: number;
  accountCount: number;
  totalBalance: number;
}

interface TradeResultSummary {
  count: number;
  profit: number;
}

interface SignalWindowSummary {
  totalExecuted: number;
  totalSkipped: number;
  totalFailed: number;
  signalCount: number;
}

interface SignalResultPreview {
  status: "executed" | "skipped" | "failed";
  currency?: string;
  martingaleStep?: number;
}

interface SignalPreview {
  _id: string;
  dispatchId?: string;
  ticker: string;
  direction: "buy" | "sell";
  botTarget: "pro" | "vip" | "mixed";
  botTargets?: Array<"pro" | "vip">;
  source?: "tradingview" | "webhook" | "admin_manual" | "mixed";
  sources?: Array<"tradingview" | "webhook" | "admin_manual">;
  totalUsers: number;
  executedCount: number;
  failedCount: number;
  skippedCount: number;
  receivedAt: string;
  results: SignalResultPreview[];
}

interface SignalsResponse {
  signals: SignalPreview[];
}

interface AdminOverview {
  users: { total: number; admins: number; newThisMonth: number; newThisWeek: number };
  subscriptions: { active: number; byPlan: { standard: number; pro: number; vip: number } };
  revenue: { byCurrency: RevenueByCurrency[] };
  trades: {
    total: number;
    today: number;
    results: Partial<Record<"won" | "lost" | "error", TradeResultSummary>>;
    byBroker?: {
      iq?: BrokerTradeStats;
      eo?: BrokerTradeStats;
      olymp?: BrokerTradeStats;
    };
  };
  profitByCurrency?: ProfitByCurrency[];
  profit?: {
    iq?: { byCurrency: ProfitByCurrency[] };
    eo?: { currency: string; totalProfit: number; wonCount: number; lostCount: number; winRate: number; isProfitable: boolean };
    olymp?: { currency: string; totalProfit: number; wonCount: number; lostCount: number; winRate: number; isProfitable: boolean };
  };
  signals: { total: number; today: number; last7Days: SignalWindowSummary };
  connectedAccounts?: {
    live?: number;
    iq?: { byCurrency: ConnectedAccountsByCurrency[] };
    eo?: { currency: string; userCount: number; accountCount: number; totalBalance: number };
    olymp?: { currency: string; userCount: number; accountCount: number; totalBalance: number };
  };
}

interface AdminAccountSummary {
  email: string;
  accountType: "REAL" | "PRACTICE";
  balance: number;
  currency: string;
  tradeAmount: number;
  martingaleStep: number;
  isConnected: boolean;
  isMain: boolean;
  tradeInFlight?: boolean;
}

interface CopyTradeStatus {
  copyTradeEnabled: boolean;
  mainAccountEmail: string | null;
  copyVipSignals: boolean;
  copyProSignals: boolean;
  mainAccount: AdminAccountSummary | null;
  subAccountCount: number;
  connectedCount: number;
  subAccounts: AdminAccountSummary[];
}

type SignalTogglePayload = {
  copyVipSignals?: boolean;
  copyProSignals?: boolean;
};

interface OlympSubmissionPreview {
  _id: string;
  olympEmail: string;
  olympAccountId: string;
  depositAmount?: number;
  status: "pending" | "approved" | "declined";
  createdAt: string;
  userId?: {
    email?: string;
    fullName?: string;
  };
}

function getSignalSummary(copyVipSignals: boolean, copyProSignals: boolean) {
  if (copyVipSignals && copyProSignals) return "VIP + PRO";
  if (copyVipSignals) return "VIP only";
  if (copyProSignals) return "PRO only";
  return "Signals off";
}

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const getErrorMessage = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback;
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [connectEmail, setConnectEmail] = useState("");
  const [connectPassword, setConnectPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [connectAccountType, setConnectAccountType] = useState<"REAL" | "PRACTICE">("REAL");
  const [connectTradeCurrency, setConnectTradeCurrency] = useState<string>("USD");
  const [connectTradeAmount, setConnectTradeAmount] = useState(() => String(getTradeAmountMinimum("USD")));

  const { data: overview } = useQuery<AdminOverview>({
    queryKey: ["admin-overview"],
    queryFn: async () => (await api.get("/admin/overview")).data,
    retry: 1,
  });

  const { data: copyTradeStatus } = useQuery<CopyTradeStatus>({
    queryKey: ["admin-copy-trade"],
    queryFn: async () => (await api.get("/admin/copy-trade")).data,
    retry: 1,
  });

  const { data: latestSignals } = useQuery<SignalsResponse>({
    queryKey: ["admin-signals-preview"],
    queryFn: async () => (await api.get("/admin/signals", { params: { page: 1, limit: 4 } })).data,
    retry: 1,
  });

  const { data: olympPending } = useQuery<{ submissions: OlympSubmissionPreview[] }>({
    queryKey: ["admin-olymp-pending-preview"],
    queryFn: async () => (await api.get("/admin/olymp-free/submissions", { params: { status: "pending" } })).data,
    refetchInterval: 15_000,
    retry: 1,
  });

  const connectMutation = useMutation({
    mutationFn: async () =>
      api.post("/admin/copy-trade/connect", {
        email: connectEmail,
        password: connectPassword,
        accountType: connectAccountType,
        tradeCurrency: connectTradeCurrency,
        tradeAmount: Number(connectTradeAmount),
      }),
    onSuccess: () => {
      toast.success(copyTradeStatus?.mainAccount ? "Sub-account connected" : "Main account connected");
      setShowConnectForm(false);
      setConnectEmail("");
      setConnectPassword("");
      queryClient.invalidateQueries({ queryKey: ["admin-copy-trade"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-signals-preview"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const refreshMutation = useMutation({
    mutationFn: async (accountEmail?: string) => api.post("/admin/copy-trade/refresh", accountEmail ? { email: accountEmail } : {}),
    onSuccess: () => {
      toast.success("Accounts refreshed");
      queryClient.invalidateQueries({ queryKey: ["admin-copy-trade"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!copyTradeStatus?.mainAccountEmail) {
        throw new Error("No main account connected");
      }

      return api.delete("/admin/copy-trade/disconnect", { data: { email: copyTradeStatus.mainAccountEmail } });
    },
    onSuccess: () => {
      toast.success("Main account disconnected");
      queryClient.invalidateQueries({ queryKey: ["admin-copy-trade"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const signalToggleMutation = useMutation({
    mutationFn: async (payload: SignalTogglePayload) =>
      (await api.put<Pick<CopyTradeStatus, "copyVipSignals" | "copyProSignals">>("/admin/copy-trade", payload)).data,
    onMutate: async (payload: SignalTogglePayload) => {
      await queryClient.cancelQueries({ queryKey: ["admin-copy-trade"] });
      const previousStatus = queryClient.getQueryData<CopyTradeStatus>(["admin-copy-trade"]);

      if (previousStatus) {
        queryClient.setQueryData<CopyTradeStatus>(["admin-copy-trade"], {
          ...previousStatus,
          copyVipSignals: payload.copyVipSignals ?? previousStatus.copyVipSignals,
          copyProSignals: payload.copyProSignals ?? previousStatus.copyProSignals,
        });
      }

      return { previousStatus };
    },
    onSuccess: () => {
      toast.success("Signal routing updated");
    },
    onError: (error: unknown, _payload, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(["admin-copy-trade"], context.previousStatus);
      }

      toast.error(getErrorMessage(error, "Failed to update signal routing"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-copy-trade"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });

  const revenueByCurrency = overview?.revenue.byCurrency ?? [];
  const tradeResults = overview?.trades.results ?? {};
  const wonTrades = tradeResults.won?.count ?? 0;
  const lostTrades = tradeResults.lost?.count ?? 0;
  const errorTrades = tradeResults.error?.count ?? 0;
  const tradeWinRate = wonTrades + lostTrades > 0 ? Math.round((wonTrades / (wonTrades + lostTrades)) * 100) : 0;
  const last7DaySignals = overview?.signals.last7Days;
  const mainAccount = copyTradeStatus?.mainAccount ?? null;
  const additionalAccounts = copyTradeStatus?.subAccounts.filter((account) => !account.isMain) ?? [];
  const isMainConnected = Boolean(mainAccount?.isConnected);
  const copyVipSignals = copyTradeStatus?.copyVipSignals ?? true;
  const copyProSignals = copyTradeStatus?.copyProSignals ?? false;
  const signalSummary = getSignalSummary(copyVipSignals, copyProSignals);
  const connectAmountMinimum = getTradeAmountMinimum(connectTradeCurrency);
  const pendingOlympSubmissions = olympPending?.submissions ?? [];

  const platformCards = [
    {
      label: "Total users",
      value: overview?.users.total ?? "—",
      note: `${overview?.users.newThisWeek ?? 0} new this week`,
      icon: Users,
    },
    {
      label: "Active subscriptions",
      value: overview?.subscriptions.active ?? "—",
      note: `PRO ${overview?.subscriptions.byPlan.pro ?? 0} · VIP ${overview?.subscriptions.byPlan.vip ?? 0}`,
      icon: UserCheck,
    },
    {
      label: "Signals today",
      value: overview?.signals.today ?? "—",
      note: `${last7DaySignals?.signalCount ?? 0} signals in the last 7 days`,
      icon: Zap,
    },
    {
      label: "Live broker sessions",
      value: overview?.connectedAccounts?.live ?? "—",
      note: `${copyTradeStatus?.connectedCount ?? 0} admin accounts live`,
      icon: Bot,
    },
    {
      label: "Trades today",
      value: overview?.trades.today ?? "—",
      note: `${wonTrades} won · ${lostTrades} lost`,
      icon: Activity,
    },
    {
      label: "Trade win rate",
      value: `${tradeWinRate}%`,
      note: `${errorTrades} errors recorded`,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="glass-panel relative overflow-hidden rounded-[32px] p-6 sm:p-8">
        <div className="surface-grid absolute inset-0 opacity-15" />
        <div className="relative grid gap-8 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-5">
            <Badge variant="secondary" className="w-fit bg-white/[0.08] text-foreground">
              Admin overview
            </Badge>
            <div className="space-y-3">
              <h1 className="font-display text-3xl font-bold sm:text-4xl">Admin dashboard</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Check users, revenue, broker accounts, trades, and signal activity from one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/admin/trades">
                  Open trade history <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/users">View users</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/copy-trade">Manage accounts</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/olymp-free">Olymp approvals</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Signals last 7d</p>
              <p className="mt-3 font-display text-3xl font-bold">{last7DaySignals?.signalCount ?? 0}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {last7DaySignals?.totalExecuted ?? 0} executed · {last7DaySignals?.totalFailed ?? 0} failed
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Revenue mix</p>
              <div className="mt-3 space-y-2">
                {revenueByCurrency.length > 0 ? (
                  revenueByCurrency.map((entry) => (
                    <div key={entry.currency} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{entry.currency}</span>
                      <span className="font-semibold text-foreground">{formatCurrency(entry.total, entry.currency)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No revenue yet</p>
                )}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Primary broker</p>
              <p className="mt-3 text-lg font-semibold text-foreground">{mainAccount?.email ?? "No main account yet"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isMainConnected ? `${signalSummary} is ready for your admin accounts.` : "Connect the first admin account to start live routing."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {platformCards.map(({ label, value, note, icon: Icon }) => (
          <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                <p className="mt-3 font-display text-3xl font-bold text-foreground">{value}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{note}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-amber-500/20 bg-amber-500/[0.06] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10">
              <Bell className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/80">Olymp Trade approvals</p>
              <h2 className="mt-1 text-xl font-bold text-foreground">
                {pendingOlympSubmissions.length} pending request{pendingOlympSubmissions.length === 1 ? "" : "s"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                User submissions for Olymp Trade free access now appear here and on the Olymp Free page.
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="/admin/olymp-free">
              Review requests <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {pendingOlympSubmissions.length > 0 ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {pendingOlympSubmissions.slice(0, 3).map((submission) => (
              <Link
                key={submission._id}
                href={`/admin/olymp-free?review=${submission._id}`}
                className="rounded-2xl border border-white/10 bg-black/10 p-4 transition-colors hover:bg-white/[0.04]"
              >
                <p className="truncate text-sm font-semibold text-foreground">
                  {submission.userId?.fullName || submission.userId?.email || submission.olympEmail}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{submission.olympEmail}</p>
                <p className="mt-2 text-xs text-amber-200">
                  ID {submission.olympAccountId} · Deposit {submission.depositAmount ?? "-"}
                </p>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Revenue</p>
              <h2 className="mt-2 text-xl font-bold">Revenue by currency</h2>
            </div>
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-6 space-y-3">
            {revenueByCurrency.length > 0 ? (
              revenueByCurrency.map((entry) => (
                <div key={entry.currency} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{entry.currency}</p>
                      <p className="text-xs text-muted-foreground">{entry.subscriptionCount} paid subscriptions</p>
                    </div>
                    <p className="font-display text-2xl font-bold text-foreground">{formatCurrency(entry.total, entry.currency)}</p>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">This month</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(entry.thisMonth, entry.currency)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Last 7 days</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(entry.last7Days, entry.currency)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Today</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(entry.today, entry.currency)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-muted-foreground">
                No revenue data yet.
              </div>
            )}
          </div>
        </div>

        {/* ── Trade Activity (redesigned) ──────────────────────────────── */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Trade activity</p>
              <h2 className="mt-2 text-xl font-bold">Performance snapshot</h2>
            </div>
            <Activity className="h-5 w-5 text-primary" />
          </div>

          {/* Win / Loss / Error bar */}
          {(() => {
            const total = wonTrades + lostTrades + errorTrades;
            const winPct = total > 0 ? (wonTrades / total) * 100 : 0;
            const lossPct = total > 0 ? (lostTrades / total) * 100 : 0;
            const errPct = total > 0 ? (errorTrades / total) * 100 : 0;
            return (
              <div className="mt-5">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>All-time outcome split</span>
                  <span className="font-semibold text-foreground">{total.toLocaleString()} trades</span>
                </div>
                <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  {winPct > 0 && <div className="bg-emerald-400 transition-all" style={{ width: `${winPct}%` }} />}
                  {lossPct > 0 && <div className="bg-red-400 transition-all" style={{ width: `${lossPct}%` }} />}
                  {errPct > 0 && <div className="bg-amber-400 transition-all" style={{ width: `${errPct}%` }} />}
                </div>
                <div className="mt-2 flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /><span className="text-muted-foreground">Won</span><span className="font-semibold text-foreground">{wonTrades.toLocaleString()}</span></span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400" /><span className="text-muted-foreground">Lost</span><span className="font-semibold text-foreground">{lostTrades.toLocaleString()}</span></span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /><span className="text-muted-foreground">Error</span><span className="font-semibold text-foreground">{errorTrades.toLocaleString()}</span></span>
                </div>
              </div>
            );
          })()}

          {/* Broker performance cards */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {/* IQ Option */}
            {(() => {
              const iq = overview?.trades.byBroker?.iq;
              const iqProfit = overview?.profit?.iq?.byCurrency ?? [];
              const iqWinRate = iq && iq.wonCount + iq.lostCount > 0 ? Math.round((iq.wonCount / (iq.wonCount + iq.lostCount)) * 100) : 0;
              return (
                <div className="rounded-2xl border border-white/[0.06] bg-blue-500/[0.04] p-4">
                  <div className="flex items-center gap-2">
                    <Image src="/autobot-assets/iq-option-small.svg" alt="IQ" width={16} height={16} className="h-4 w-4 object-contain" />
                    <span className="text-xs font-semibold text-blue-300">IQ Option</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-y-3 text-[11px]">
                    <div>
                      <p className="text-muted-foreground">Win rate</p>
                      <p className="mt-0.5 text-lg font-bold text-emerald-400">{iqWinRate}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total trades</p>
                      <p className="mt-0.5 text-lg font-bold text-foreground">{(iq?.totalTrades ?? 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Won / Lost</p>
                      <p className="mt-0.5 font-semibold text-foreground">{iq?.wonCount ?? 0}W · {iq?.lostCount ?? 0}L</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Net profit</p>
                      {iqProfit.length > 0 ? (
                        <div className="mt-0.5 space-y-0.5">
                          {iqProfit.map((e) => (
                            <p key={e.currency} className={`font-semibold ${e.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {e.totalProfit >= 0 ? "+" : ""}{formatCurrency(e.totalProfit, e.currency)}
                            </p>
                          ))}
                        </div>
                      ) : <p className="mt-0.5 font-semibold text-muted-foreground">—</p>}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ExpertOption */}
            {(() => {
              const eo = overview?.trades.byBroker?.eo;
              const eoProfit = overview?.profit?.eo;
              const eoWinRate = eo && eo.wonCount + eo.lostCount > 0 ? Math.round((eo.wonCount / (eo.wonCount + eo.lostCount)) * 100) : 0;
              return (
                <div className="rounded-2xl border border-white/[0.06] bg-purple-500/[0.04] p-4">
                  <div className="flex items-center gap-2">
                    <Image src="/autobot-assets/experoptionlogo.png" alt="EO" width={16} height={16} className="h-4 w-4 object-contain" />
                    <span className="text-xs font-semibold text-purple-300">ExpertOption</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-y-3 text-[11px]">
                    <div>
                      <p className="text-muted-foreground">Win rate</p>
                      <p className="mt-0.5 text-lg font-bold text-emerald-400">{eoWinRate}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total trades</p>
                      <p className="mt-0.5 text-lg font-bold text-foreground">{(eo?.totalTrades ?? 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Won / Lost</p>
                      <p className="mt-0.5 font-semibold text-foreground">{eo?.wonCount ?? 0}W · {eo?.lostCount ?? 0}L</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Net profit</p>
                      {eoProfit ? (
                        <p className={`mt-0.5 font-semibold ${eoProfit.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {eoProfit.totalProfit >= 0 ? "+" : ""}{formatCurrency(eoProfit.totalProfit, "USD")}
                        </p>
                      ) : <p className="mt-0.5 font-semibold text-muted-foreground">—</p>}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Olymp Trade */}
            {(() => {
              const olymp = overview?.trades.byBroker?.olymp;
              const olympProfit = overview?.profit?.olymp;
              const olympWinRate = olymp && olymp.wonCount + olymp.lostCount > 0 ? Math.round((olymp.wonCount / (olymp.wonCount + olymp.lostCount)) * 100) : 0;
              return (
                <div className="rounded-2xl border border-white/[0.06] bg-emerald-500/[0.04] p-4">
                  <div className="flex items-center gap-2">
                    <Image src="/autobot-assets/olymptrade.jpeg" alt="Olymp" width={16} height={16} className="h-4 w-4 rounded-sm object-contain" />
                    <span className="text-xs font-semibold text-emerald-300">Olymp Trade</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-y-3 text-[11px]">
                    <div>
                      <p className="text-muted-foreground">Win rate</p>
                      <p className="mt-0.5 text-lg font-bold text-emerald-400">{olympWinRate}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total trades</p>
                      <p className="mt-0.5 text-lg font-bold text-foreground">{(olymp?.totalTrades ?? 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Won / Lost</p>
                      <p className="mt-0.5 font-semibold text-foreground">{olymp?.wonCount ?? 0}W · {olymp?.lostCount ?? 0}L</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Net profit</p>
                      {olympProfit ? (
                        <p className={`mt-0.5 font-semibold ${olympProfit.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {olympProfit.totalProfit >= 0 ? "+" : ""}{formatCurrency(olympProfit.totalProfit, "USD")}
                        </p>
                      ) : <p className="mt-0.5 font-semibold text-muted-foreground">—</p>}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Signal delivery */}
          <div className="mt-4 rounded-2xl border border-white/[0.06] bg-black/10 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Signal delivery · last 7 days</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-emerald-500/[0.07] py-2.5">
                <p className="font-display text-xl font-bold text-emerald-400">{(last7DaySignals?.totalExecuted ?? 0).toLocaleString()}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Executed</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] py-2.5">
                <p className="font-display text-xl font-bold text-foreground">{(last7DaySignals?.totalSkipped ?? 0).toLocaleString()}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Skipped</p>
              </div>
              <div className="rounded-xl bg-red-500/[0.07] py-2.5">
                <p className="font-display text-xl font-bold text-red-400">{(last7DaySignals?.totalFailed ?? 0).toLocaleString()}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Failed</p>
              </div>
            </div>
          </div>

          {/* Connected accounts by broker */}
          {(overview?.connectedAccounts?.iq || overview?.connectedAccounts?.eo || overview?.connectedAccounts?.olymp) && (
            <div className="mt-4 rounded-2xl border border-white/[0.06] bg-black/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Connected accounts by broker</p>
              <div className="mt-3 space-y-2">
                {overview.connectedAccounts.iq?.byCurrency?.filter((e) => e.accountCount > 0).map((entry) => (
                  <div key={entry.currency} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-blue-500/[0.04] px-3 py-2.5 text-xs">
                    <div className="flex items-center gap-1.5 text-blue-300 font-semibold">
                      <Image src="/autobot-assets/iq-option-small.svg" alt="IQ" width={12} height={12} className="h-3 w-3 object-contain" />
                      IQ · {entry.currency}
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span><span className="font-semibold text-foreground">{entry.userCount}</span> users</span>
                      <span><span className="font-semibold text-foreground">{entry.accountCount}</span> accts</span>
                      <span className="font-semibold text-foreground">{formatCurrency(entry.totalBalance, entry.currency)}</span>
                    </div>
                  </div>
                ))}
                {overview.connectedAccounts.eo && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-purple-500/[0.04] px-3 py-2.5 text-xs">
                    <div className="flex items-center gap-1.5 text-purple-300 font-semibold">
                      <Image src="/autobot-assets/experoptionlogo.png" alt="EO" width={12} height={12} className="h-3 w-3 object-contain" />
                      EO · USD
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span><span className="font-semibold text-foreground">{overview.connectedAccounts.eo.userCount}</span> users</span>
                      <span><span className="font-semibold text-foreground">{overview.connectedAccounts.eo.accountCount}</span> accts</span>
                      <span className="font-semibold text-foreground">{formatCurrency(overview.connectedAccounts.eo.totalBalance, "USD")}</span>
                    </div>
                  </div>
                )}
                {overview.connectedAccounts.olymp && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-emerald-500/[0.04] px-3 py-2.5 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                      <Image src="/autobot-assets/olymptrade.jpeg" alt="Olymp" width={12} height={12} className="h-3 w-3 rounded-sm object-contain" />
                      Olymp · USD
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span><span className="font-semibold text-foreground">{overview.connectedAccounts.olymp.userCount}</span> users</span>
                      <span><span className="font-semibold text-foreground">{overview.connectedAccounts.olymp.accountCount}</span> accts</span>
                      <span className="font-semibold text-foreground">{formatCurrency(overview.connectedAccounts.olymp.totalBalance, "USD")}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Admin accounts</p>
              <h2 className="mt-2 text-xl font-bold">Main and connected accounts</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {isMainConnected
                  ? "Main account is live. You can add more accounts here or manage them on the accounts page."
                  : "No main account is connected yet. Connect the first admin account to start routing signals."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {copyTradeStatus?.copyTradeEnabled ? <Badge variant="success">Copy-trade live</Badge> : <Badge variant="secondary">Copy-trade paused</Badge>}
              {isMainConnected ? <Badge variant="success">Main live</Badge> : <Badge variant="warning">Needs main account</Badge>}
              <Button variant="outline" size="sm" onClick={() => refreshMutation.mutate(undefined)} disabled={refreshMutation.isPending}>
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                Refresh accounts
              </Button>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-black/10 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Primary signal account</p>
                <h3 className="mt-2 text-lg font-bold text-foreground">{mainAccount?.email ?? "No account connected yet"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mainAccount
                    ? `${mainAccount.accountType} account · balance ${formatCurrency(mainAccount.balance, mainAccount.currency)}`
                    : "The first connected admin account becomes the main signal account."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setShowConnectForm((value) => !value)}>
                  <Link2 className="mr-2 h-4 w-4" /> {mainAccount ? "Connect another account" : "Connect main account"}
                </Button>
                {mainAccount ? (
                  <Button variant="danger" onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending}>
                    {disconnectMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2Off className="mr-2 h-4 w-4" />}
                    Disconnect main
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">VIP</p>
                    <p className="mt-1 text-xs text-muted-foreground">Off or on for VIP signals.</p>
                  </div>
                  <Switch
                    checked={copyVipSignals}
                    onCheckedChange={(checked) => signalToggleMutation.mutate({ copyVipSignals: checked, copyProSignals })}
                    disabled={signalToggleMutation.isPending}
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">PRO</p>
                    <p className="mt-1 text-xs text-muted-foreground">Off or on for PRO signals.</p>
                  </div>
                  <Switch
                    checked={copyProSignals}
                    onCheckedChange={(checked) => signalToggleMutation.mutate({ copyVipSignals, copyProSignals: checked })}
                    disabled={signalToggleMutation.isPending}
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {signalToggleMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              <span>{signalSummary}</span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Connected accounts</p>
                <p className="mt-2 font-display text-2xl font-bold text-foreground">{copyTradeStatus?.connectedCount ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Additional accounts</p>
                <p className="mt-2 font-display text-2xl font-bold text-foreground">{additionalAccounts.length}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Main trade amount</p>
                <p className="mt-2 font-display text-2xl font-bold text-foreground">{mainAccount ? formatCurrency(mainAccount.tradeAmount, mainAccount.currency) : "—"}</p>
              </div>
            </div>

            {additionalAccounts.length > 0 ? (
              <div className="mt-5 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Additional connected accounts</p>
                <div className="space-y-2">
                  {additionalAccounts.slice(0, 3).map((account) => (
                    <div key={account.email} className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{account.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Step {account.martingaleStep} · {formatCurrency(account.tradeAmount, account.currency)} per trade
                        </p>
                      </div>
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${account.isConnected ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-muted-foreground"}`}>
                        {account.isConnected ? "Live" : "Offline"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {showConnectForm ? (
            <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">{mainAccount ? "Connect another sub-account" : "Connect the main signal account"}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">The first connected admin account becomes the main signal account automatically.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" placeholder="admin@iqoption.com" value={connectEmail} onChange={(event) => setConnectEmail(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Password</Label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="••••••••" className="pr-10" value={connectPassword} onChange={(event) => setConnectPassword(event.target.value)} />
                    <button type="button" className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground" onClick={() => setShowPassword((value) => !value)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Account type</Label>
                  <div className="flex gap-2">
                    {(["REAL", "PRACTICE"] as const).map((accountType) => (
                      <button
                        key={accountType}
                        type="button"
                        onClick={() => setConnectAccountType(accountType)}
                        className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors ${connectAccountType === accountType ? "border-primary bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"}`}
                      >
                        {accountType}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Trade currency</Label>
                  <select
                    className="flex h-11 w-full rounded-2xl border border-input bg-background/70 px-4 text-sm text-foreground"
                    value={connectTradeCurrency}
                    onChange={(event) => {
                      const nextCurrency = event.target.value;
                      setConnectTradeCurrency(nextCurrency);
                      setConnectTradeAmount((currentAmount) => String(clampTradeAmountToCurrency(Number(currentAmount), nextCurrency)));
                    }}
                  >
                    {supportedTradeCurrencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Trade amount</Label>
                  <Input type="number" min={connectAmountMinimum} value={connectTradeAmount} onChange={(event) => setConnectTradeAmount(event.target.value)} />
                  <p className="text-xs text-muted-foreground">{getTradeAmountRequirement(connectTradeCurrency)}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending || !connectEmail || !connectPassword || Number(connectTradeAmount) < connectAmountMinimum}>
                  {connectMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                  {mainAccount ? "Connect account" : "Connect main account"}
                </Button>
                <Button variant="outline" onClick={() => setShowConnectForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Admin shortcuts</p>
                <h2 className="mt-2 text-xl font-bold">Quick links</h2>
              </div>
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-5 space-y-3">
              {[
                { label: "Inspect trade history", href: "/admin/trades", note: "View signal results, martingale steps, and account outcomes." },
                { label: "Open user directory", href: "/admin/users", note: "Check plans, admins, and active members." },
                { label: "Manage pricing", href: "/admin/pricing", note: "Update plans and pricing." },
                { label: "Review bot settings", href: "/admin/bots", note: "Manage bot status and settings." },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/10 px-4 py-3 transition-colors hover:bg-white/[0.04]">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Plan distribution</p>
            <div className="mt-5 space-y-3">
              {[
                { label: "Standard", value: overview?.subscriptions.byPlan.standard ?? 0 },
                { label: "Pro", value: overview?.subscriptions.byPlan.pro ?? 0 },
                { label: "VIP", value: overview?.subscriptions.byPlan.vip ?? 0 },
              ].map((plan) => (
                <div key={plan.label} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-foreground">{plan.label}</span>
                    <span className="font-display text-2xl font-bold text-foreground">{plan.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Latest signals</p>
            <h2 className="mt-2 text-xl font-bold">Recent signal history</h2>
            <p className="mt-1 text-sm text-muted-foreground">Recent signal activity is shown below. Open trade history for full details.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/trades">
              View full trade history <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          {(latestSignals?.signals ?? []).length > 0 ? (
            latestSignals?.signals.map((signal) => {
              const martingaleCounts = signal.results.reduce<Record<string, number>>((counts, result) => {
                if (typeof result.martingaleStep === "number") {
                  const key = `Step ${result.martingaleStep}`;
                  counts[key] = (counts[key] ?? 0) + 1;
                }
                return counts;
              }, {});

              return (
                <div key={signal._id} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-foreground">{signal.ticker}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${signal.direction === "buy" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                          {signal.direction}
                        </span>
                        {(signal.botTargets?.length ? signal.botTargets : [signal.botTarget]).map((target) => (
                          <span key={`${signal._id}-${target}`} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {target}
                          </span>
                        ))}
                        {(signal.sources?.length ? signal.sources : signal.source ? [signal.source] : []).map((source) => (
                          <span key={`${signal._id}-${source}`} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {source.replaceAll("_", " ")}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{formatDate(signal.receivedAt, "MMM d, yyyy · HH:mm:ss")}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-center">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Targeted</p>
                        <p className="mt-1 font-semibold text-foreground">{signal.totalUsers}</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-center">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Executed</p>
                        <p className="mt-1 font-semibold text-foreground">{signal.executedCount}</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-center">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Failed</p>
                        <p className="mt-1 font-semibold text-foreground">{signal.failedCount}</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-center">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Skipped</p>
                        <p className="mt-1 font-semibold text-foreground">{signal.skippedCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {Object.entries(martingaleCounts).length > 0 ? (
                      Object.entries(martingaleCounts).map(([step, count]) => (
                        <span key={step} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-muted-foreground">
                          {step} × {count}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-muted-foreground">No martingale steps recorded</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-muted-foreground">
              No signal history yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
