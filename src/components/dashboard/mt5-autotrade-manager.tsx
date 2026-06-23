"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  Eye,
  EyeOff,
  PlugZap,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TrendingUp,
  WalletCards,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, normalizeUserProfile } from "@/lib/api";
import { MetaTrader5Icon } from "@/components/icons/metatrader5-icon";
import { queryKeys } from "@/lib/query-keys";
import type { PlanTier, UserProfile } from "@/types";

interface Mt5Account {
  _id: string;
  brokerName: string;
  serverName: string;
  login: string;
  accountType: "demo" | "real";
  status: "pending" | "deploying" | "connected" | "disconnected" | "error";
  balance: number;
  equity: number;
  currency: string;
  isSynchronized: boolean;
  isTradable: boolean;
  automationEnabled: boolean;
  blockGlobalSignals: boolean;
  riskMode?: "risk_amount" | "fixed_lot";
  defaultRiskUsd: number;
  maxRiskUsd: number;
  defaultLot?: number;
  maxLot?: number;
  webhookToken: string;
  lastStatusAt?: string;
  lastError?: string;
}

type Mt5SettingsDraft = {
  riskMode: "risk_amount" | "fixed_lot";
  defaultRiskUsd: number;
  maxRiskUsd: number;
  defaultLot: number;
  maxLot: number;
};

interface Mt5BrokerSuggestion {
  id: string;
  brokerName: string;
  serverName: string;
  label: string;
  source: "typesense" | "metaapi";
}

interface Mt5Strategy {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  symbol?: string;
  enabled: boolean;
  defaultEnabled: boolean;
}

function getAccountLimit(plan: PlanTier | undefined) {
  if (plan === "VIP") return 2;
  if (plan === "PRO" || plan === "STANDARD") return 1;
  return 0;
}

function statusTone(status: Mt5Account["status"]) {
  if (status === "connected") return "success";
  if (status === "error") return "warning";
  return "secondary";
}

function formatMoney(value: number, currency = "USD") {
  return `${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function Mt5AutoTradeManager() {
  const queryClient = useQueryClient();
  const [brokerName, setBrokerName] = useState("");
  const [serverName, setServerName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const accountType: "real" = "real";
  const [showPassword, setShowPassword] = useState(false);
  const [disconnectAccount, setDisconnectAccount] = useState<Mt5Account | null>(null);
  const [blockConfirmAccount, setBlockConfirmAccount] = useState<Mt5Account | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [settingsDrafts, setSettingsDrafts] = useState<Record<string, Mt5SettingsDraft>>({});

  const brokerQuery = `${brokerName} ${serverName}`.trim();

  const { data: profile } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => normalizeUserProfile((await api.get("/user/profile")).data) as UserProfile | null,
  });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: queryKeys.mt5Accounts,
    queryFn: async () => {
      const response = await api.get("/mt5/accounts");
      return (response.data?.accounts ?? []) as Mt5Account[];
    },
    refetchInterval: 30_000,
  });

  const { data: overviewStats } = useQuery({
    queryKey: ["mt5-overview"],
    queryFn: async () => {
      const response = await api.get("/mt5/overview");
      return response.data as { totalPips: number; totalProfit: number; winRate: number; totalTrades: number; pipsToday: number; profitToday: number };
    },
    enabled: accounts.length > 0,
    refetchInterval: 30_000,
  });

  const { data: strategies = [] } = useQuery({
    queryKey: ["mt5-strategies"],
    queryFn: async () => ((await api.get("/mt5/strategies")).data?.strategies ?? []) as Mt5Strategy[],
    enabled: accounts.length > 0,
    staleTime: 30_000,
  });

  const { data: brokerSuggestions = [], isFetching: searchingBrokers } = useQuery({
    queryKey: ["mt5-brokers", brokerQuery],
    queryFn: async () => {
      const response = await api.get("/mt5/brokers", { params: { query: brokerQuery } });
      return ((response.data?.suggestions ?? []) as Mt5BrokerSuggestion[]).filter(
        (suggestion) => !/\b(demo|trial|practice)\b/i.test(suggestion.serverName)
      );
    },
    enabled: brokerQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const activePlan = profile?.subscription?.active ? profile.subscription.plan : profile?.plan;
  const accountLimit = getAccountLimit(activePlan);
  const connectedCount = accounts.filter((account) => account.status !== "disconnected").length;
  const connectedReady = accounts.filter((account) => account.status === "connected").length;
  const canConnect = accountLimit > 0 && connectedCount < accountLimit;

  const totals = useMemo(() => {
    return accounts.reduce(
      (acc, account) => ({
        balance: acc.balance + Number(account.balance ?? 0),
        equity: acc.equity + Number(account.equity ?? 0),
      }),
      { balance: 0, equity: 0 },
    );
  }, [accounts]);

  const connectMutation = useMutation({
    mutationFn: async () => {
      await api.post("/mt5/accounts", {
        brokerName,
        serverName,
        login,
        password,
        accountType,
      });
    },
    onSuccess: () => {
      toast.success("MT5 connection started");
      setBrokerName("");
      setServerName("");
      setLogin("");
      setPassword("");
      setSuggestionsOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.mt5Accounts });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to connect MT5 account");
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async (accountId: string) => {
      await api.post(`/mt5/accounts/${accountId}/refresh`);
    },
    onSuccess: () => {
      toast.success("MT5 account refreshed");
      queryClient.invalidateQueries({ queryKey: queryKeys.mt5Accounts });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to refresh MT5 account");
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (accountId: string) => {
      await api.delete(`/mt5/accounts/${accountId}`);
    },
    onSuccess: () => {
      toast.success("MT5 account disconnected");
      setDisconnectAccount(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.mt5Accounts });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect MT5 account");
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async ({ accountId, values }: { accountId: string; values: Mt5SettingsDraft }) => {
      await api.patch(`/mt5/accounts/${accountId}/settings`, values);
    },
    onSuccess: () => {
      toast.success("MT5 settings saved");
      queryClient.invalidateQueries({ queryKey: queryKeys.mt5Accounts });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save MT5 settings");
    },
  });

  const automationMutation = useMutation({
    mutationFn: async ({ accountId, automationEnabled }: { accountId: string; automationEnabled: boolean }) => {
      await api.patch(`/mt5/accounts/${accountId}/automation`, {
        automationEnabled,
        undeployWhenPaused: true,
      });
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.automationEnabled ? "MT5 automation resuming" : "MT5 automation paused and undeployed");
      queryClient.invalidateQueries({ queryKey: queryKeys.mt5Accounts });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update MT5 automation");
    },
  });

  const blockSignalsMutation = useMutation({
    mutationFn: async ({ accountId, blockGlobalSignals }: { accountId: string; blockGlobalSignals: boolean }) => {
      await api.patch(`/mt5/accounts/${accountId}/settings`, { blockGlobalSignals });
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.blockGlobalSignals ? "Nojai signals blocked — only your own signals will trade" : "Nojai signals enabled");
      queryClient.invalidateQueries({ queryKey: queryKeys.mt5Accounts });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update signal preference");
    },
  });

  const strategyMutation = useMutation({
    mutationFn: async ({ strategyId, enabled }: { strategyId: string; enabled: boolean }) => {
      await api.patch(`/mt5/strategies/${strategyId}`, { enabled });
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.enabled ? "Strategy enabled" : "Strategy paused");
      queryClient.invalidateQueries({ queryKey: ["mt5-strategies"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update strategy");
    },
  });

  function chooseBroker(suggestion: Mt5BrokerSuggestion) {
    setBrokerName(suggestion.brokerName);
    setServerName(suggestion.serverName);
    setSuggestionsOpen(false);
  }

  function getDraft(account: Mt5Account) {
    return settingsDrafts[account._id] ?? {
      riskMode: account.riskMode === "fixed_lot" ? "fixed_lot" : "risk_amount",
      defaultRiskUsd: Number(account.defaultRiskUsd ?? 10),
      maxRiskUsd: Number(account.maxRiskUsd ?? 50),
      defaultLot: Number(account.defaultLot ?? 0.01),
      maxLot: Number(account.maxLot ?? 100),
    };
  }

  function updateDraft(account: Mt5Account, values: Partial<Mt5SettingsDraft>) {
    setSettingsDrafts((current) => ({
      ...current,
      [account._id]: { ...getDraft(account), ...values },
    }));
  }

  function riskError(draft: Mt5SettingsDraft): string | null {
    if (draft.riskMode === "fixed_lot") {
      if (draft.defaultLot < 0.01) return "Lot size must be at least 0.01";
      if (draft.maxLot < 0.01) return "Max lot must be at least 0.01";
      if (draft.defaultLot > draft.maxLot) return "Lot size cannot exceed max lot";
      return null;
    }
    if (draft.defaultRiskUsd > draft.maxRiskUsd) return "Default risk cannot exceed max risk";
    if (draft.defaultRiskUsd < 0.01) return "Risk per trade must be at least $0.01";
    if (draft.maxRiskUsd < 0.01) return "Max risk must be at least $0.01";
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="mt5-outer-panel overflow-hidden rounded-3xl border border-white/[0.08] bg-[#071018]">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="border-b border-white/[0.08] p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#59c7f9]/25 bg-[#59c7f9]/10">
                <MetaTrader5Icon className="h-8 w-8" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default">MT5 AutoTrade</Badge>
                <Badge variant={connectedReady > 0 ? "success" : "secondary"}>{connectedReady} ready</Badge>
              </div>
            </div>
            <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight sm:text-3xl">MetaTrader execution, inside NojAI.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Connect your MT5 accounts, verify sync status, and automate your trades from TradingView signals. Standard and Pro support 1 MT5 account; VIP supports 2.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.08] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/70">Capacity</p>
                  <Server className="h-4 w-4 text-cyan-300" />
                </div>
                <p className="mt-2 text-2xl font-semibold">{connectedCount}/{accountLimit}</p>
              </div>
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-200/70">Balance</p>
                  <WalletCards className="h-4 w-4 text-emerald-300" />
                </div>
                <p className="mt-2 text-xl font-semibold">{formatMoney(totals.balance)}</p>
              </div>
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.08] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/70">Equity</p>
                  <Activity className="h-4 w-4 text-amber-300" />
                </div>
                <p className="mt-2 text-xl font-semibold">{formatMoney(totals.equity)}</p>
              </div>
              <div className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.08] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/70">Total Pips</p>
                  <TrendingUp className="h-4 w-4 text-violet-300" />
                </div>
                <p className={`mt-2 text-xl font-semibold ${
                  (overviewStats?.totalPips ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                }`}>
                  {overviewStats ? `${(overviewStats.totalPips ?? 0) >= 0 ? "+" : ""}${overviewStats.totalPips.toFixed(1)}` : "—"}
                </p>
              </div>
            </div>
          </div>

          <form
            className="p-5 sm:p-6"
            onSubmit={(event) => {
              event.preventDefault();
              connectMutation.mutate();
            }}
          >
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Connect MT5</h2>
                <p className="mt-1 text-xs text-muted-foreground">Search broker servers or enter one manually.</p>
              </div>
              <span className="inline-flex w-fit rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold uppercase text-emerald-300">
                Real accounts only
              </span>
            </div>

            <div className="space-y-4">
              <div className="relative grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="mt5-broker">Find broker server</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="mt5-broker"
                      value={brokerName}
                      onChange={(event) => {
                        setBrokerName(event.target.value);
                        setSuggestionsOpen(true);
                      }}
                      onFocus={() => setSuggestionsOpen(true)}
                      className="pl-10"
                      placeholder="Start typing broker name or server..."
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="mt5-server">MT5 server</Label>
                  <Input
                    id="mt5-server"
                    value={serverName}
                    onChange={(event) => {
                      setServerName(event.target.value);
                      setSuggestionsOpen(true);
                    }}
                    onFocus={() => setSuggestionsOpen(true)}
                    placeholder="Exact server from MT5 mobile"
                    required
                  />
                </div>

                {suggestionsOpen && brokerQuery.length >= 2 ? (
                  <div className="mt5-suggestions-panel z-20 mt-1 max-h-80 overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#08111a] p-2 shadow-2xl md:absolute md:left-0 md:right-0 md:top-[150px] md:mt-0">
                    <div className="mb-1 flex items-center justify-between px-2 py-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Typesense search</span>
                      {searchingBrokers ? <span className="text-[10px] text-cyan-300">Searching...</span> : null}
                    </div>
                    {brokerSuggestions.length > 0 ? (
                      brokerSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onClick={() => chooseBroker(suggestion)}
                          className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-foreground">{suggestion.brokerName}</span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{suggestion.serverName}</span>
                          </span>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                            suggestion.source === "typesense" ? "bg-cyan-500/15 text-cyan-300" : "bg-emerald-500/15 text-emerald-300"
                          }`}>
                            {suggestion.source}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-sm text-muted-foreground">
                        No indexed server yet. Enter the exact server shown in your MT5 mobile app.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="mt5-login">Login</Label>
                  <Input id="mt5-login" value={login} onChange={(event) => setLogin(event.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mt5-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="mt5-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {!canConnect ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] p-3 text-sm text-amber-100">
                  {accountLimit === 0 ? "MT5 AutoTrade requires an active Forex Leverage / MT5 subscription." : "Your MT5 account limit has been reached."}
                </div>
              ) : null}

              <Button type="submit" className="w-full gap-2" disabled={!canConnect || connectMutation.isPending}>
                <PlugZap className="h-4 w-4" />
                {connectMutation.isPending ? "Connecting..." : "Connect account"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {strategies.length > 0 ? (
        <section className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">NojAI MT5 Strategies</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Choose which global MT5 webhook strategies can trade on your connected accounts.</p>
            </div>
            <Badge variant="outline">{strategies.filter((strategy) => strategy.enabled).length} enabled</Badge>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {strategies.map((strategy) => (
              <div key={strategy._id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-background/50 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{strategy.name}</p>
                    {strategy.symbol ? <Badge variant="secondary">{strategy.symbol}</Badge> : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{strategy.description || "Global MT5 strategy webhook"}</p>
                </div>
                <Button
                  type="button"
                  variant={strategy.enabled ? "default" : "outline"}
                  size="sm"
                  className="shrink-0 gap-2"
                  onClick={() => strategyMutation.mutate({ strategyId: strategy._id, enabled: !strategy.enabled })}
                  disabled={strategyMutation.isPending}
                >
                  {strategy.enabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  {strategy.enabled ? "On" : "Off"}
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Connected Accounts</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Account sync, tradability, and health status.</p>
          </div>
          <Badge variant="outline">{accounts.length} total</Badge>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 text-sm text-muted-foreground">Loading MT5 accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">No MT5 account connected yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Connect a real MT5 account, then refresh until the account is reported as synchronized.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {accounts.map((account) => (
              <article key={account._id} className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5">
                {(() => {
                  const draft = getDraft(account);
                  return (
                    <>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold">{account.brokerName}</h3>
                      <Badge variant={statusTone(account.status)}>{account.status}</Badge>
                      <Badge variant={account.automationEnabled ? "success" : "secondary"}>
                        {account.automationEnabled ? "automation on" : "paused"}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{account.login} · {account.serverName}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      onClick={() => refreshMutation.mutate(account._id)}
                      disabled={refreshMutation.isPending}
                      aria-label="Refresh MT5 account"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="danger" size="icon" onClick={() => setDisconnectAccount(account)} aria-label="Disconnect MT5 account">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.07] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-200/70">Balance</p>
                    <p className="mt-1 font-semibold">{formatMoney(account.balance, account.currency)}</p>
                  </div>
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.07] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-200/70">Equity</p>
                    <p className="mt-1 font-semibold">{formatMoney(account.equity, account.currency)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Sync</p>
                    <p className="mt-1 flex items-center gap-1.5 font-semibold">
                      {account.isSynchronized ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-amber-400" />}
                      {account.isSynchronized ? "Ready" : "Waiting"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Trading</p>
                    <p className="mt-1 flex items-center gap-1.5 font-semibold">
                      <ShieldCheck className={`h-4 w-4 ${account.isTradable ? "text-emerald-400" : "text-muted-foreground"}`} />
                      {account.isTradable ? "Allowed" : "Locked"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">Trade size method</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Choose money risk or enter the exact lot size the bot should use.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 rounded-full border border-white/[0.08] bg-black/20 p-1 text-xs font-semibold">
                      <button
                        type="button"
                        className={`rounded-full px-3 py-2 transition-colors ${draft.riskMode === "risk_amount" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        onClick={() => updateDraft(account, { riskMode: "risk_amount" })}
                      >
                        Risk amount ($)
                      </button>
                      <button
                        type="button"
                        className={`rounded-full px-3 py-2 transition-colors ${draft.riskMode === "fixed_lot" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        onClick={() => updateDraft(account, { riskMode: "fixed_lot" })}
                      >
                        Fixed lot size
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto_auto] xl:items-end">
                    {draft.riskMode === "fixed_lot" ? (
                      <>
                        <div className="grid gap-1.5">
                          <Label htmlFor={`default-lot-${account._id}`}>Lot size per trade</Label>
                          <Input
                            id={`default-lot-${account._id}`}
                            type="number"
                            min="0.01"
                            max="100"
                            step="0.01"
                            value={draft.defaultLot}
                            className={riskError(draft) ? "border-red-500 focus-visible:ring-red-500" : ""}
                            onChange={(event) => updateDraft(account, { defaultLot: Number(event.target.value) })}
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor={`max-lot-${account._id}`}>Max lot cap</Label>
                          <Input
                            id={`max-lot-${account._id}`}
                            type="number"
                            min="0.01"
                            max="100"
                            step="0.01"
                            value={draft.maxLot}
                            onChange={(event) => updateDraft(account, { maxLot: Number(event.target.value) })}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid gap-1.5">
                          <Label htmlFor={`default-risk-${account._id}`}>Risk amount per trade ($)</Label>
                          <Input
                            id={`default-risk-${account._id}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={draft.defaultRiskUsd}
                            className={riskError(draft) ? "border-red-500 focus-visible:ring-red-500" : ""}
                            onChange={(event) => updateDraft(account, { defaultRiskUsd: Number(event.target.value) })}
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor={`max-risk-${account._id}`}>Max risk cap ($)</Label>
                          <Input
                            id={`max-risk-${account._id}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={draft.maxRiskUsd}
                            onChange={(event) => updateDraft(account, { maxRiskUsd: Number(event.target.value) })}
                          />
                        </div>
                      </>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => saveSettingsMutation.mutate({ accountId: account._id, values: draft })}
                      disabled={saveSettingsMutation.isPending || Boolean(riskError(draft))}
                      className="w-full xl:w-auto"
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant={account.automationEnabled ? "danger" : "default"}
                      onClick={() => automationMutation.mutate({ accountId: account._id, automationEnabled: !account.automationEnabled })}
                      disabled={automationMutation.isPending}
                      className="w-full xl:w-auto"
                    >
                      {account.automationEnabled ? "Pause" : "Resume"}
                    </Button>
                  </div>
                  {riskError(draft) && (
                    <p className="mt-2 text-xs font-medium text-red-400">{riskError(draft)}</p>
                  )}
                </div>

                {/* Block Nojai global signals */}
                <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-sm font-semibold">Use my own signals only</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Block Nojai global signals. This account will only auto-trade signals sent directly to its personal webhook.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={account.blockGlobalSignals}
                    disabled={blockSignalsMutation.isPending}
                    onClick={() => {
                      if (!account.blockGlobalSignals) {
                        // Turning ON block — ask for confirmation
                        setBlockConfirmAccount(account);
                      } else {
                        // Turning OFF block — re-enable Nojai signals immediately
                        blockSignalsMutation.mutate({ accountId: account._id, blockGlobalSignals: false });
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 ${
                      account.blockGlobalSignals
                        ? "bg-amber-500 focus-visible:ring-amber-500"
                        : "bg-black/20 dark:bg-white/20 focus-visible:ring-black/30"
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-1 ring-black/10 transition-transform ${
                      account.blockGlobalSignals ? "translate-x-5" : "translate-x-0.5"
                    }`} />
                  </button>
                </div>

                {account.lastError ? <p className="mt-4 rounded-2xl bg-amber-500/[0.08] p-3 text-sm text-amber-100">{account.lastError}</p> : null}
                    </>
                  );
                })()}
              </article>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(disconnectAccount)}
        title="Disconnect MT5 account?"
        description={disconnectAccount ? `${disconnectAccount.brokerName} ${disconnectAccount.login} will stop receiving automation.` : ""}
        confirmLabel="Disconnect"
        destructive
        loading={disconnectMutation.isPending}
        onOpenChange={(open) => !open && setDisconnectAccount(null)}
        onConfirm={() => disconnectAccount && disconnectMutation.mutate(disconnectAccount._id)}
      />

      <ConfirmDialog
        open={Boolean(blockConfirmAccount)}
        title="Use your own signals only?"
        description={`Turning this on means Nojai global signals will be blocked for ${blockConfirmAccount?.brokerName ?? "this account"}. Only signals sent directly to this account's personal webhook will be auto-traded. You can turn it back on at any time.`}
        confirmLabel="Yes, use my own signals"
        cancelLabel="Cancel"
        loading={blockSignalsMutation.isPending}
        onOpenChange={(open) => !open && setBlockConfirmAccount(null)}
        onConfirm={() => {
          if (blockConfirmAccount) {
            blockSignalsMutation.mutate({ accountId: blockConfirmAccount._id, blockGlobalSignals: true });
            setBlockConfirmAccount(null);
          }
        }}
      />

    </div>
  );
}
