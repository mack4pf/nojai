"use client";

import type { ElementType } from "react";
import { useState } from "react";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BotMessageSquare,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Copy,
  DollarSign,
  Eye,
  Link2,
  Loader2,
  Pause,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface GlobalWebhookInfo {
  url: string | null;
  enabled: boolean;
  hasSecret: boolean;
}

interface BotInfo {
  _id: string;
  name: string;
  slug: string;
  status: string;
}

interface OverviewData {
  accounts: {
    total: number;
    byStatus: Record<string, number>;
    automationEnabled: number;
    real: number;
    demo: number;
  };
  balance: { total: number; equity: number };
  trades: {
    total: number;
    open: number;
    todayCount: number;
    todayProfit: number;
    totalProfit: number;
    winRate: number;
    resolvedCount: number;
  };
}

interface Mt5Account {
  _id: string;
  id?: string;
  accountId?: string;
  metaApiAccountId?: string;
  login?: string;
  brokerName?: string;
  serverName?: string;
  accountType?: "real" | "demo";
  status: string;
  balance?: number;
  equity?: number;
  balanceUsd?: number;
  equityUsd?: number;
  exchangeRateToUsd?: number;
  currency?: string;
  isSynchronized?: boolean;
  isTradable?: boolean;
  automationEnabled?: boolean;
  blockGlobalSignals?: boolean;
  defaultRiskUsd?: number;
  maxRiskUsd?: number;
  lastStatusAt?: string;
  lastError?: string;
  createdAt?: string;
  assignedBotId?: string | null;
  trades: { total: number; open: number };
  user: { _id: string; fullName: string; email: string } | null;
}

interface AccountsResponse {
  total: number;
  page: number;
  limit: number;
  accounts: Mt5Account[];
}

interface AccountDetail {
  account: Mt5Account & { webhookToken?: string; disconnectedAt?: string; assignedBotId?: string | null };
  user: { _id: string; fullName: string; email: string } | null;
  stats: {
    totalTrades: number;
    openTrades: number;
    closedTrades: number;
    winRate: number;
    realizedPnl: number;
    unrealizedPnl: number;
    totalPips: number;
  };
  recentTrades: Array<{
    _id: string;
    asset: string;
    direction: string;
    lot?: number;
    openPrice?: number;
    closePrice?: number;
    status: string;
    result?: string;
    profit?: number;
    pips?: number;
    openTime?: string;
    closeTime?: string;
  }>;
}

interface ProfitabilityBucket {
  label: string;
  profit: number;
  loss: number;
  net: number;
  trades: number;
}

interface ProfitabilityData {
  timeframe: string;
  buckets: ProfitabilityBucket[];
  summary: {
    totalProfit: number;
    totalLoss: number;
    netProfit: number;
    winRate: number;
    totalTrades: number;
    topAsset: string;
  };
  byAccount: Array<{
    accountId: string;
    login?: string;
    brokerName?: string;
    netProfit: number;
    winRate: number;
    trades: number;
  }>;
}

const statusStyles: Record<string, { label: string; className: string; dot: string }> = {
  connected: {
    label: "Connected",
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
  deploying: {
    label: "Deploying",
    className: "border-amber-500/25 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400",
  },
  pending: {
    label: "Pending",
    className: "border-sky-500/25 bg-sky-500/10 text-sky-300",
    dot: "bg-sky-400",
  },
  disconnected: {
    label: "Offline",
    className: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  error: {
    label: "Error",
    className: "border-danger/30 bg-danger/10 text-danger",
    dot: "bg-danger",
  },
};

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function hasNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed);
  }
  return false;
}

function fmt(value: unknown, digits = 2) {
  if (!hasNumber(value)) return "-";
  return toNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function currency(value?: unknown, prefix = "$") {
  if (!hasNumber(value)) return "-";
  const amount = toNumber(value);
  return `${amount >= 0 ? "" : "-"}${prefix}${fmt(Math.abs(amount))}`;
}

function money(value: unknown, currencyCode = "USD") {
  if (!hasNumber(value)) return "-";
  const normalizedCurrency = String(currencyCode || "USD").toUpperCase();
  if (normalizedCurrency === "USD") return currency(value);
  return `${fmt(value)} ${normalizedCurrency}`;
}

function signedCurrency(value?: unknown) {
  if (!hasNumber(value)) return "-";
  const amount = toNumber(value);
  return `${amount >= 0 ? "+" : "-"}$${fmt(Math.abs(amount))}`;
}

function friendlyMt5Error(value?: string) {
  if (!value) return "";
  if (value.toLowerCase().includes("account info unavailable") || value.toLowerCase().includes("not connected to broker")) {
    return "Broker account info is not ready yet. Refresh after MetaApi finishes connecting this MT5 account.";
  }
  return "MT5 sync warning. Refresh the account or check the broker connection if this continues.";
}

function accountIdentifier(account: Partial<Mt5Account>) {
  return String(account._id ?? account.id ?? account.accountId ?? account.metaApiAccountId ?? account.login ?? "");
}

function normalizeAccountsResponse(value: unknown): AccountsResponse {
  const record = (value ?? {}) as Record<string, unknown>;
  const rawAccounts = Array.isArray(record.accounts) ? record.accounts : [];
  const accounts = rawAccounts.map((item) => {
    const account = item as Partial<Mt5Account>;
    const id = accountIdentifier(account);
    return {
      ...account,
      _id: id,
      trades: account.trades ?? { total: 0, open: 0 },
      user: account.user ?? null,
    } as Mt5Account;
  }).filter((account) => account._id);

  return {
    total: toNumber(record.total ?? accounts.length),
    page: toNumber(record.page ?? 1),
    limit: toNumber(record.limit ?? 20),
    accounts,
  };
}

function normalizeProfitabilityResponse(value: unknown, timeframe: ProfitabilityData["timeframe"]): ProfitabilityData {
  const record = (value ?? {}) as Record<string, unknown>;
  const rawBuckets = Array.isArray(record.buckets)
    ? record.buckets
    : Array.isArray(record.data)
      ? record.data
      : [];

  const buckets = rawBuckets.map((item) => {
    const bucket = item as Record<string, unknown>;
    const net = toNumber(bucket.net ?? bucket.profit ?? bucket.cumProfit ?? 0);
    const profit = hasNumber(bucket.profit) && toNumber(bucket.profit) > 0 ? toNumber(bucket.profit) : Math.max(net, 0);
    const loss = hasNumber(bucket.loss) ? Math.abs(toNumber(bucket.loss)) : Math.abs(Math.min(net, 0));
    return {
      label: String(bucket.label ?? bucket.date ?? ""),
      profit,
      loss,
      net,
      trades: toNumber(bucket.trades ?? bucket.count ?? 0),
    };
  });

  const rawSummary = (record.summary ?? {}) as Record<string, unknown>;
  const totalProfit = hasNumber(rawSummary.totalProfit) ? toNumber(rawSummary.totalProfit) : buckets.reduce((sum, bucket) => sum + bucket.profit, 0);
  const totalLoss = hasNumber(rawSummary.totalLoss) ? toNumber(rawSummary.totalLoss) : buckets.reduce((sum, bucket) => sum + bucket.loss, 0);
  const totalTrades = hasNumber(rawSummary.totalTrades) ? toNumber(rawSummary.totalTrades) : buckets.reduce((sum, bucket) => sum + bucket.trades, 0);

  return {
    timeframe,
    buckets,
    summary: {
      totalProfit,
      totalLoss,
      netProfit: hasNumber(rawSummary.netProfit) ? toNumber(rawSummary.netProfit) : totalProfit - totalLoss,
      winRate: toNumber(rawSummary.winRate ?? 0),
      totalTrades,
      topAsset: String(rawSummary.topAsset ?? ""),
    },
    byAccount: (Array.isArray(record.byAccount) ? record.byAccount : []).map((item) => {
      const account = item as Record<string, unknown>;
      return {
        accountId: String(account.accountId ?? account._id ?? account.id ?? ""),
        login: account.login ? String(account.login) : undefined,
        brokerName: account.brokerName ? String(account.brokerName) : undefined,
        netProfit: toNumber(account.netProfit ?? account.totalProfit ?? 0),
        winRate: toNumber(account.winRate ?? 0),
        trades: toNumber(account.trades ?? account.totalTrades ?? 0),
      };
    }).filter((account) => account.accountId),
  };
}

function StatusPill({ status }: { status: string }) {
  const config = statusStyles[status] ?? statusStyles.disconnected;
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold", config.className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot, status === "connected" && "animate-pulse")} />
      {config.label}
    </span>
  );
}

function ShellCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-3xl border border-border bg-card shadow-glow", className)}>
      {children}
    </div>
  );
}

function StatTile({
  label,
  value,
  note,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  note?: string;
  icon: ElementType;
  tone?: "default" | "success" | "danger" | "warning" | "info";
}) {
  const toneClass = {
    default: "text-primary bg-primary/10 border-primary/20",
    success: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    danger: "text-danger bg-danger/10 border-danger/20",
    warning: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    info: "text-sky-300 bg-sky-500/10 border-sky-500/20",
  }[tone];

  return (
    <ShellCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="mt-3 truncate font-display text-2xl font-bold text-foreground sm:text-3xl">{value}</p>
          {note ? <p className="mt-2 text-sm text-muted-foreground">{note}</p> : null}
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border", toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </ShellCard>
  );
}

function MiniHealthBar({ overview }: { overview?: OverviewData }) {
  const total = Math.max(overview?.accounts.total ?? 0, 1);
  const entries = [
    { key: "connected", className: "bg-emerald-400" },
    { key: "deploying", className: "bg-amber-400" },
    { key: "pending", className: "bg-sky-400" },
    { key: "error", className: "bg-danger" },
    { key: "disconnected", className: "bg-muted-foreground/50" },
  ];

  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-muted">
      {entries.map(({ key, className }) => {
        const count = overview?.accounts.byStatus[key] ?? 0;
        if (count <= 0) return null;
        return <div key={key} className={className} style={{ width: `${(count / total) * 100}%` }} />;
      })}
    </div>
  );
}

function AccountDrawer({ accountId, onClose }: { accountId: string; onClose: () => void }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<AccountDetail>({
    queryKey: ["admin-mt5-account", accountId],
    queryFn: () => api.get(`/admin/mt5/accounts/${accountId}`).then((response) => response.data),
    retry: 1,
    staleTime: 15000,
  });

  const { data: bots } = useQuery<BotInfo[]>({
    queryKey: ["admin-mt5-bots"],
    queryFn: () => api.get("/admin/mt5/bots").then((r) => r.data),
    staleTime: 60000,
  });

  const assignBotMutation = useMutation({
    mutationFn: (botId: string | null) => api.post(`/admin/mt5/accounts/${accountId}/assign-bot`, { botId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-mt5-account", accountId] }),
  });

  const refreshMutation = useMutation({
    mutationFn: () => api.post(`/admin/mt5/accounts/${accountId}/refresh`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-mt5-account", accountId] }),
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => api.post(`/admin/mt5/accounts/${accountId}/toggle-automation`, { enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-mt5-account", accountId] });
      qc.invalidateQueries({ queryKey: ["admin-mt5-accounts"] });
      qc.invalidateQueries({ queryKey: ["admin-mt5-overview"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/admin/mt5/accounts/${accountId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-mt5-accounts"] });
      qc.invalidateQueries({ queryKey: ["admin-mt5-overview"] });
      onClose();
    },
  });

  const account = data?.account;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close account details" className="absolute inset-0 bg-background/75 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-border bg-background shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Account Inspector</p>
              <h2 className="mt-2 font-display text-2xl font-bold">
                {account?.login ? `Login ${account.login}` : "Loading account"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{account?.brokerName ?? "MetaTrader 5"} {account?.serverName ? `/ ${account.serverName}` : ""}</p>
            </div>
            <button type="button" className="rounded-full border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-[420px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !account ? (
          <div className="flex min-h-[420px] items-center justify-center text-muted-foreground">Account not found.</div>
        ) : (
          <div className="space-y-6 p-6">
            <ShellCard className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <StatusPill status={account.status} />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}>
                    <RefreshCw className={cn("h-4 w-4", refreshMutation.isPending && "animate-spin")} />
                    Sync
                  </Button>
                  <Button
                    size="sm"
                    variant={account.automationEnabled ? "danger" : "default"}
                    className="gap-2"
                    onClick={() => toggleMutation.mutate(!account.automationEnabled)}
                    disabled={toggleMutation.isPending}
                  >
                    {account.automationEnabled ? <Pause className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                    {account.automationEnabled ? "Pause automation" : "Enable automation"}
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Owner</p>
                  <p className="mt-1 truncate font-semibold">{data.user?.fullName ?? "Unknown user"}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{data.user?.email ?? "-"}</p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Balance / Equity</p>
                  <p className="mt-1 font-mono font-semibold">{currency(account.balance)} / {currency(account.equity)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{account.currency ?? "USD"}</p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Risk settings</p>
                  <p className="mt-1 font-semibold">${account.defaultRiskUsd ?? "-"} / trade</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Max ${account.maxRiskUsd ?? "-"} / trade</p>
                </div>
              </div>
            </ShellCard>

            {data.stats ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Trades", value: data.stats.totalTrades, note: `${data.stats.openTrades} open`, icon: Activity, tone: "info" },
                  { label: "Win Rate", value: `${data.stats.winRate}%`, note: `${data.stats.closedTrades} closed`, icon: ShieldCheck, tone: "default" },
                  {
                    label: "Net P/L",
                    value: signedCurrency(data.stats.realizedPnl),
                    note: "",
                    icon: TrendingUp,
                    tone: toNumber(data.stats.realizedPnl) > 0 ? "success" : toNumber(data.stats.realizedPnl) < 0 ? "danger" : "default",
                  },
                  {
                    label: "Open P&L",
                    value: data.stats.unrealizedPnl !== 0 ? signedCurrency(data.stats.unrealizedPnl) : "—",
                    note: "Estimated from open positions",
                    icon: Clock,
                    tone: toNumber(data.stats.unrealizedPnl) > 0 ? "success" : toNumber(data.stats.unrealizedPnl) < 0 ? "danger" : "default",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const toneClass = {
                    default: "text-primary bg-primary/10 border-primary/20",
                    success: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
                    danger: "text-danger bg-danger/10 border-danger/20",
                    warning: "text-amber-300 bg-amber-500/10 border-amber-500/20",
                    info: "text-sky-300 bg-sky-500/10 border-sky-500/20",
                  }[item.tone as "default" | "success" | "danger" | "warning" | "info"];
                  return (
                    <div key={item.label} className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                          <p className="mt-2 font-mono text-lg font-bold text-foreground">{item.value}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
                        </div>
                        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", toneClass)}>
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <ShellCard className="p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Technical State</p>
              <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                {[
                  ["Account type", account.accountType === "real" ? "Real money" : "Demo"],
                  ["Synchronized", account.isSynchronized ? "Yes" : "No"],
                  ["Tradable", account.isTradable ? "Yes" : "No"],
                  ["Block global signals", account.blockGlobalSignals ? "Yes" : "No"],
                  ["Added", fmtDate(account.createdAt)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 break-all font-medium">{value ?? "-"}</p>
                  </div>
                ))}
              </div>
              {account.lastError ? (
                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                  <span className="font-semibold">Sync warning:</span> {friendlyMt5Error(account.lastError)}
                </div>
              ) : null}
              {account.webhookToken ? (
                <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Webhook token</p>
                  <code className="mt-2 block break-all font-mono text-xs text-muted-foreground">{account.webhookToken}</code>
                </div>
              ) : null}
            </ShellCard>

            {/* ── Bot Assignment ── */}
            <ShellCard className="p-5">
              <div className="flex items-center gap-2">
                <BotMessageSquare className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Bot Assignment</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Connect this MT5 account to a specific signal bot.</p>
              <div className="mt-4 flex items-center gap-3">
                <select
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={data.account.assignedBotId ?? ""}
                  onChange={(e) => assignBotMutation.mutate(e.target.value || null)}
                  disabled={assignBotMutation.isPending}
                >
                  <option value="">— No bot assigned —</option>
                  {(bots ?? []).map((bot) => (
                    <option key={bot._id} value={bot._id}>{bot.name}</option>
                  ))}
                </select>
                {assignBotMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {data.account.assignedBotId ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => assignBotMutation.mutate(null)} disabled={assignBotMutation.isPending}>
                    Unassign
                  </Button>
                ) : null}
              </div>
              {data.account.assignedBotId ? (
                <p className="mt-2 text-xs text-emerald-400">Connected to: {(bots ?? []).find((b) => b._id === data.account.assignedBotId)?.name ?? data.account.assignedBotId}</p>
              ) : null}
            </ShellCard>

            <ShellCard className="p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Recent Trades</p>
              {data.recentTrades.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No recent MT5 trades for this account.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {data.recentTrades.slice(0, 10).map((trade) => (
                    <div key={trade._id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-muted/25 p-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", trade.direction === "buy" ? "bg-emerald-500/10 text-emerald-300" : "bg-danger/10 text-danger")}>
                            {trade.direction}
                          </span>
                          <p className="truncate font-semibold">{trade.asset}</p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{trade.lot ?? "-"} lot {trade.openPrice ? `/ ${trade.openPrice}` : ""}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn("font-mono text-sm font-semibold", (trade.profit ?? 0) > 0 ? "text-emerald-300" : (trade.profit ?? 0) < 0 ? "text-danger" : "text-muted-foreground")}>
                          {trade.profit != null ? signedCurrency(trade.profit) : "-"}
                        </p>
                        <p className="text-xs text-muted-foreground">{trade.status === "open" ? "Open" : trade.result ?? trade.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ShellCard>

            <ShellCard className="border-danger/20 bg-danger/5 p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-danger">
                <AlertTriangle className="h-4 w-4" />
                Danger zone
              </p>
              <p className="mt-2 text-sm text-muted-foreground">Deleting this account removes the account record and its related MT5 trades.</p>
              <Button
                variant="danger"
                size="sm"
                className="mt-4 gap-2"
                onClick={() => {
                  if (confirm(`Delete MT5 account ${account.login ?? accountId}? This cannot be undone.`)) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete account
              </Button>
            </ShellCard>
          </div>
        )}
      </aside>
    </div>
  );
}

function AccountsTab({ onSelect }: { onSelect: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data, isLoading } = useQuery<AccountsResponse>({
    queryKey: ["admin-mt5-accounts", page, search, statusFilter, typeFilter],
    queryFn: () =>
      api.get("/admin/mt5/accounts", {
        params: {
          page,
          limit: 20,
          search: search || undefined,
          status: statusFilter,
          type: typeFilter,
        },
      }).then((response) => normalizeAccountsResponse(response.data)),
    retry: 1,
    staleTime: 15000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });

  const totalPages = Math.ceil((data?.total ?? 0) / 20);
  const statusOptions = ["all", "connected", "deploying", "pending", "error", "disconnected"];

  return (
    <div className="space-y-5">
      <ShellCard className="p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(240px,360px)_1fr_auto] xl:items-center">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search login, broker, email..."
              className="h-12 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={cn(
                  "rounded-full border px-3 py-2 text-xs font-semibold capitalize transition-colors",
                  statusFilter === status
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {status === "all" ? "All status" : status}
              </button>
            ))}
          </div>

          <div className="flex rounded-2xl border border-border bg-background p-1">
            {(["all", "real", "demo"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setTypeFilter(type);
                  setPage(1);
                }}
                className={cn(
                  "rounded-xl px-4 py-2 text-xs font-semibold uppercase transition-colors",
                  typeFilter === type ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </ShellCard>

      <ShellCard className="overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Connected Accounts</p>
              <p className="text-xs text-muted-foreground">{data?.total ?? 0} accounts match current filters</p>
            </div>
            <Server className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/45 text-left">
              <tr>
                {["User", "Login", "Broker", "Status", "Balance", "Automation", "Trades", "Added", ""].map((header) => (
                  <th key={header} className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
                  </td>
                </tr>
              ) : !data?.accounts.length ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <Server className="mx-auto h-10 w-10 text-muted-foreground/30" />
                    <p className="mt-3 text-sm text-muted-foreground">No MT5 accounts found.</p>
                  </td>
                </tr>
              ) : (
                data.accounts.map((account) => (
                  <tr key={account._id} className="cursor-pointer transition-colors hover:bg-muted/35" onClick={() => onSelect(account._id)}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-foreground">{account.user?.fullName ?? "Unknown user"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{account.user?.email ?? "-"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-mono font-semibold text-foreground">{account.login ?? "-"}</p>
                      <p className={cn("mt-1 text-[10px] font-bold uppercase tracking-wide", account.accountType === "real" ? "text-emerald-300" : "text-sky-300")}>
                        {account.accountType ?? "-"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-foreground">{account.brokerName ?? "-"}</p>
                      <p className="mt-1 max-w-[170px] truncate text-xs text-muted-foreground">{account.serverName ?? "-"}</p>
                    </td>
                    <td className="px-5 py-4"><StatusPill status={account.status} /></td>
                    <td className="px-5 py-4">
                      <p className="font-mono font-semibold">{currency(account.balance)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Equity {currency(account.equity)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                        account.automationEnabled
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                          : "border-border bg-muted text-muted-foreground",
                      )}>
                        {account.automationEnabled ? <Zap className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                        {account.automationEnabled ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold">{account.trades.total}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{account.trades.open} open</p>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{fmtDate(account.createdAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelect(account._id);
                        }}
                        aria-label="View MT5 account"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-border px-5 py-4">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" size="icon" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </ShellCard>
    </div>
  );
}

function ProfitabilityTab() {
  const [timeframe, setTimeframe] = useState<"1D" | "1W" | "1M" | "ALL">("1W");

  const { data, isLoading } = useQuery<ProfitabilityData>({
    queryKey: ["admin-mt5-profitability", timeframe],
    queryFn: () => api.get("/admin/mt5/profitability", { params: { timeframe } }).then((response) => normalizeProfitabilityResponse(response.data, timeframe)),
    retry: 1,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const buckets = data?.buckets ?? [];
  const summary = data?.summary;
  const maxAccountProfit = Math.max(...(data?.byAccount ?? []).map((account) => Math.abs(account.netProfit)), 1);

  return (
    <div className="space-y-6">
      <ShellCard className="p-4">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-semibold text-foreground">Profitability Timeline</p>
            <p className="text-xs text-muted-foreground">Gross profit, gross loss, and net movement across MT5 trades.</p>
          </div>
          <div className="flex rounded-2xl border border-border bg-background p-1">
            {(["1D", "1W", "1M", "ALL"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTimeframe(option)}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                  timeframe === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </ShellCard>

      {summary ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Net P/L" value={signedCurrency(summary.netProfit)} note={`Gross ${currency(summary.totalProfit)}`} icon={TrendingUp} tone={summary.netProfit >= 0 ? "success" : "danger"} />
          <StatTile label="Win Rate" value={`${summary.winRate}%`} note={`${summary.totalTrades} trades`} icon={BarChart3} />
          <StatTile label="Gross Loss" value={currency(summary.totalLoss)} note="losing trades total" icon={AlertTriangle} tone="danger" />
          <StatTile label="Top Asset" value={summary.topAsset || "-"} note="most active symbol" icon={Activity} tone="info" />
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-3xl border border-border bg-card" />)}
        </div>
      ) : null}

      <ShellCard className="p-6">
        {isLoading ? (
          <div className="flex h-80 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : buckets.length === 0 ? (
          <div className="flex h-80 items-center justify-center rounded-3xl border border-dashed border-border text-sm text-muted-foreground">
            No MT5 trade data for this timeframe yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={buckets} margin={{ top: 10, right: 18, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="mt5ProfitFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mt5LossFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(value) => `$${value}`} width={64} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "16px",
                  color: "hsl(var(--foreground))",
                }}
                formatter={(value: unknown) => `$${fmt(Number(value))}`}
              />
              <Area type="monotone" dataKey="profit" name="Gross Profit" stroke="#10b981" strokeWidth={2.5} fill="url(#mt5ProfitFill)" />
              <Area type="monotone" dataKey="loss" name="Gross Loss" stroke="#ef4444" strokeWidth={2.5} fill="url(#mt5LossFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ShellCard>

      {(data?.byAccount?.length ?? 0) > 0 ? (
        <ShellCard className="p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Account Profit Ranking</p>
          <div className="mt-5 space-y-5">
            {data!.byAccount.map((account) => {
              const width = `${(Math.abs(account.netProfit) / maxAccountProfit) * 100}%`;
              const positive = account.netProfit >= 0;
              return (
                <div key={account.accountId} className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold">{account.login ?? account.accountId.slice(-8)}</p>
                      <p className="truncate text-xs text-muted-foreground">{account.brokerName ?? "Unknown broker"}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-mono text-sm font-semibold", positive ? "text-emerald-300" : "text-danger")}>{signedCurrency(account.netProfit)}</p>
                      <p className="text-xs text-muted-foreground">{account.trades} trades / {account.winRate}% win</p>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", positive ? "bg-emerald-400" : "bg-danger")} style={{ width }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ShellCard>
      ) : null}
    </div>
  );
}

export function AdminMt5AccountsReview() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-[32px] border border-border bg-card p-6 shadow-glow sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              <Users className="h-3.5 w-3.5" />
              MT5 account review
            </div>
            <h1 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">Connected MT5 accounts</h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Review every connected MetaTrader account, open a user activity drawer, inspect recent trades, and act on sync or automation issues.
            </p>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/admin/mt5">
              Back to MT5 overview
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <AccountsTab onSelect={setSelectedId} />

      {selectedId ? <AccountDrawer accountId={selectedId} onClose={() => setSelectedId(null)} /> : null}
    </div>
  );
}

export function AdminMt5Dashboard() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [webhookCopied, setWebhookCopied] = useState(false);

  const {
    data: overview,
    isLoading: overviewLoading,
    isFetching: overviewFetching,
    refetch,
  } = useQuery<OverviewData>({
    queryKey: ["admin-mt5-overview"],
    queryFn: () => api.get("/admin/mt5/overview").then((response) => response.data),
    retry: 1,
    staleTime: 15000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: webhookInfo, isLoading: webhookLoading } = useQuery<GlobalWebhookInfo>({
    queryKey: ["admin-mt5-global-webhook"],
    queryFn: () => api.get("/admin/mt5/global-webhook").then((r) => r.data),
    staleTime: 60000,
    retry: 1,
  });

  const toggleWebhookMutation = useMutation({
    mutationFn: (enabled: boolean) => api.post("/admin/mt5/global-webhook/toggle", { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-mt5-global-webhook"] }),
  });

  const copyWebhook = () => {
    if (!webhookInfo?.url) return;
    navigator.clipboard.writeText(webhookInfo.url).then(() => {
      setWebhookCopied(true);
      setTimeout(() => setWebhookCopied(false), 2000);
    });
  };

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-mt5-overview"] });
    queryClient.invalidateQueries({ queryKey: ["admin-mt5-accounts"] });
    queryClient.invalidateQueries({ queryKey: ["admin-mt5-profitability"] });
    refetch();
  };

  return (
    <div className="space-y-6 pb-12">
      <section className="overflow-hidden rounded-[32px] border border-border bg-card shadow-glow">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.85fr)]">
          <div className="relative min-h-[320px] overflow-hidden p-6 sm:p-8">
            <div className="surface-grid absolute inset-0 opacity-20" />
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                <Server className="h-3.5 w-3.5" />
                MT5 operations
              </div>
              <h1 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
                MetaTrader control room
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                Monitor every connected MT5 account, spot sync problems quickly, review platform profit, and control automation from one admin surface.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button onClick={refreshAll} disabled={overviewFetching} className="gap-2">
                  <RefreshCw className={cn("h-4 w-4", overviewFetching && "animate-spin")} />
                  Refresh live data
                </Button>
                <Button asChild variant="outline" className="gap-2">
                  <Link href="/admin/mt5/accounts">
                    Review accounts
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-border bg-background/50 p-6 xl:border-l xl:border-t-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Connection health</p>
                <p className="mt-2 font-display text-3xl font-bold">
                  {overviewLoading ? "-" : `${overview?.accounts.byStatus.connected ?? 0}/${overview?.accounts.total ?? 0}`}
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-5">
              <MiniHealthBar overview={overview} />
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Today P/L</p>
                  <p className={cn("mt-1 font-mono text-lg font-bold", (overview?.trades.todayProfit ?? 0) >= 0 ? "text-emerald-300" : "text-danger")}>
                    {overviewLoading ? "-" : signedCurrency(overview?.trades.todayProfit ?? 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Win rate</p>
                  <p className="mt-1 font-mono text-lg font-bold">{overviewLoading ? "-" : `${overview?.trades.winRate ?? 0}%`}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Automation</p>
                  <p className="mt-1 font-mono text-lg font-bold">{overviewLoading ? "-" : overview?.accounts.automationEnabled ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Open trades</p>
                  <p className="mt-1 font-mono text-lg font-bold">{overviewLoading ? "-" : overview?.trades.open ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewLoading ? (
          Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-3xl border border-border bg-card" />)
        ) : overview ? (
          <>
            <StatTile label="Total Accounts" value={overview.accounts.total} note={`${overview.accounts.real} real / ${overview.accounts.demo} demo`} icon={Users} />
            <StatTile label="Balance" value={currency(overview.balance.total)} note="combined MT5 balance" icon={DollarSign} tone="success" />
            <StatTile label="Equity" value={currency(overview.balance.equity)} note="including open P/L" icon={TrendingUp} tone="info" />
            <StatTile label="All-Time P/L" value={signedCurrency(overview.trades.totalProfit)} note={`${overview.trades.resolvedCount} resolved trades`} icon={BarChart3} tone={overview.trades.totalProfit >= 0 ? "success" : "danger"} />
            <StatTile label="Automation" value={overview.accounts.automationEnabled} note="accounts actively trading" icon={Zap} tone="warning" />
            <StatTile label="Win Rate" value={`${overview.trades.winRate}%`} note="all closed trades" icon={ShieldCheck} />
            <StatTile label="Today Trades" value={overview.trades.todayCount} note={signedCurrency(overview.trades.todayProfit)} icon={Clock} tone={(overview.trades.todayProfit ?? 0) >= 0 ? "success" : "danger"} />
            <StatTile
              label="Needs Attention"
              value={(overview.accounts.byStatus.error ?? 0) + (overview.accounts.byStatus.deploying ?? 0)}
              note={`${overview.accounts.byStatus.error ?? 0} errors / ${overview.accounts.byStatus.deploying ?? 0} deploying`}
              icon={AlertTriangle}
              tone={(overview.accounts.byStatus.error ?? 0) > 0 ? "danger" : "default"}
            />
          </>
        ) : null}
      </section>

      {/* ── Global Webhook Card ── */}
      <ShellCard className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Link2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">Global Signal Webhook</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Paste this URL in TradingView or any signal provider. All eligible MT5 accounts will receive the signal.</p>
              {webhookLoading ? (
                <div className="mt-2 h-5 w-72 animate-pulse rounded-lg bg-muted" />
              ) : webhookInfo?.url ? (
                <div className="mt-2 flex items-center gap-2">
                  <code className="max-w-[420px] truncate rounded-lg border border-border bg-muted/50 px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                    {webhookInfo.url}
                  </code>
                  <Button type="button" size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={copyWebhook}>
                    <Copy className="h-3.5 w-3.5" />
                    {webhookCopied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-amber-400">Set <code className="font-mono">MT5_GLOBAL_WEBHOOK_SECRET</code> and <code className="font-mono">API_BASE_URL</code> env vars to generate the URL.</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:mt-1">
            <span className={cn("text-xs font-semibold", webhookInfo?.enabled ? "text-emerald-300" : "text-muted-foreground")}>
              {webhookInfo?.enabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={webhookInfo?.enabled ?? true}
              disabled={webhookLoading || toggleWebhookMutation.isPending}
              onCheckedChange={(checked) => toggleWebhookMutation.mutate(checked)}
            />
          </div>
        </div>
      </ShellCard>

      <Tabs defaultValue="accounts" className="space-y-6">
        <TabsList className="h-auto rounded-2xl border border-border bg-card p-1">
          <TabsTrigger value="accounts" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="mr-2 h-4 w-4" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="profitability" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="mr-2 h-4 w-4" />
            Profitability
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-0">
          <AccountsTab onSelect={setSelectedId} />
        </TabsContent>

        <TabsContent value="profitability" className="mt-0">
          <ProfitabilityTab />
        </TabsContent>
      </Tabs>

      {selectedId ? <AccountDrawer accountId={selectedId} onClose={() => setSelectedId(null)} /> : null}
    </div>
  );
}
