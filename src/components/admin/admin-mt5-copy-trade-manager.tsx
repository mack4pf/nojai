"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Trash2,
  WalletCards,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetaTrader5Icon } from "@/components/icons/metatrader5-icon";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Mt5AdminAccount {
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
  webhookToken: string;
  lastStatusAt?: string;
  lastError?: string;
}

interface Mt5BrokerSuggestion {
  id: string;
  brokerName: string;
  serverName: string;
  label: string;
  source: "typesense" | "local";
}

interface Mt5CopyTerminal {
  totals: { relationships: number; active: number; pending: number; copiedOpen: number; copiedFailed: number };
  relationships: Array<{
    _id: string;
    status: string;
    providerUserId?: { email?: string; fullName?: string };
    followerUserId?: { email?: string; fullName?: string };
    providerAccountId?: { login?: string; brokerName?: string; copyProviderName?: string };
    followerAccountId?: { login?: string; brokerName?: string };
    lotMultiplier: number;
    copyManualTrades: boolean;
    copyWebhookSignals: boolean;
  }>;
  copyTrades: Array<{ _id: string; symbol: string; action: string; volume: number; status: string; source: string; errorMessage?: string }>;
  topProviders: Array<{ userId: string; email?: string; fullName?: string; trades: number; profit: number; winRate: number }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusTone(status: Mt5AdminAccount["status"]) {
  if (status === "connected") return "success" as const;
  if (status === "error") return "warning" as const;
  return "secondary" as const;
}

function formatMoney(value: number, currency = "USD") {
  return `${Number(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminMt5CopyTradeManager() {
  const queryClient = useQueryClient();

  // Connect form
  const [brokerName, setBrokerName] = useState("");
  const [serverName, setServerName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);

  // Confirm disconnect
  const [disconnectAccount, setDisconnectAccount] = useState<Mt5AdminAccount | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────

  const brokerQuery = `${brokerName} ${serverName}`.trim();

  const { data: accounts = [], isLoading } = useQuery<Mt5AdminAccount[]>({
    queryKey: ["admin-mt5-own-accounts"],
    queryFn: async () => {
      const res = await api.get("/mt5/accounts");
      return (res.data?.accounts ?? []) as Mt5AdminAccount[];
    },
    refetchInterval: 30_000,
  });

  const { data: brokerSuggestions = [], isFetching: searchingBrokers } = useQuery<Mt5BrokerSuggestion[]>({
    queryKey: ["mt5-brokers-admin", brokerQuery],
    queryFn: async () => {
      const res = await api.get("/mt5/brokers", { params: { query: brokerQuery } });
      return ((res.data?.suggestions ?? []) as Mt5BrokerSuggestion[]).filter(
        (suggestion) => !/\b(demo|trial|practice)\b/i.test(suggestion.serverName)
      );
    },
    enabled: brokerQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const { data: copyTerminal } = useQuery<Mt5CopyTerminal>({
    queryKey: ["admin-mt5-copy-terminal"],
    queryFn: async () => (await api.get("/admin/mt5/copy-trading")).data,
    refetchInterval: 30_000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const connectMutation = useMutation({
    mutationFn: async () =>
      api.post("/mt5/accounts", { brokerName, serverName, login, password, accountType: "real" }),
    onSuccess: () => {
      toast.success("MT5 account connection started");
      setBrokerName("");
      setServerName("");
      setLogin("");
      setPassword("");
      setShowConnectForm(false);
      setSuggestionsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-mt5-own-accounts"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? error?.message ?? "Failed to connect MT5 account");
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async (accountId: string) => api.post(`/mt5/accounts/${accountId}/refresh`),
    onSuccess: () => {
      toast.success("Account refreshed");
      queryClient.invalidateQueries({ queryKey: ["admin-mt5-own-accounts"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? "Failed to refresh account");
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (accountId: string) => api.delete(`/mt5/accounts/${accountId}`),
    onSuccess: () => {
      toast.success("MT5 account disconnected");
      setDisconnectAccount(null);
      queryClient.invalidateQueries({ queryKey: ["admin-mt5-own-accounts"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? "Failed to disconnect account");
    },
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);
  const totalEquity = accounts.reduce((sum, a) => sum + (a.equity ?? 0), 0);
  const connectedCount = accounts.filter((a) => a.status === "connected").length;

  function chooseBroker(suggestion: Mt5BrokerSuggestion) {
    setBrokerName(suggestion.brokerName);
    setServerName(suggestion.serverName);
    setSuggestionsOpen(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header + stats */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#071018] p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#59c7f9]/25 bg-[#59c7f9]/10">
            <MetaTrader5Icon className="h-8 w-8" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">MT5 Copy Trading</Badge>
            <Badge variant={connectedCount > 0 ? "success" : "secondary"}>{connectedCount} connected</Badge>
            <Badge variant="outline">{accounts.length} total · unlimited</Badge>
          </div>
        </div>
        <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">
          MT5 Copy Trading Terminal
        </h2>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          See who is copying whose MT5 trades, monitor active follower links, and manage admin MT5 accounts for testing or strategy work.
        </p>

        {/* Stats row */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.08] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/70">Accounts</p>
              <Server className="h-4 w-4 text-cyan-300" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{accounts.length}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{connectedCount} connected</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-200/70">Balance</p>
              <WalletCards className="h-4 w-4 text-emerald-300" />
            </div>
            <p className="mt-2 text-xl font-semibold">{formatMoney(totalBalance)}</p>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.08] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/70">Equity</p>
              <Activity className="h-4 w-4 text-amber-300" />
            </div>
            <p className="mt-2 text-xl font-semibold">{formatMoney(totalEquity)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold">MT5 Copy Trade Terminal</h3>
            <p className="mt-1 text-xs text-muted-foreground">Monitor who is copying whose MT5 trades, provider performance, and copied execution health.</p>
          </div>
          <Badge variant="outline">{copyTerminal?.totals.active ?? 0} active</Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {[
            ["Relationships", copyTerminal?.totals.relationships ?? 0],
            ["Active", copyTerminal?.totals.active ?? 0],
            ["Pending", copyTerminal?.totals.pending ?? 0],
            ["Open copies", copyTerminal?.totals.copiedOpen ?? 0],
            ["Failed", copyTerminal?.totals.copiedFailed ?? 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Copy relationships</p>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {(copyTerminal?.relationships ?? []).length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/[0.08] p-4 text-sm text-muted-foreground">No MT5 copy relationships yet.</p>
              ) : copyTerminal?.relationships.slice(0, 20).map((rel) => (
                <div key={rel._id} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{rel.followerUserId?.email ?? "Follower"} copies {rel.providerUserId?.email ?? "Provider"}</p>
                      <p className="truncate text-xs text-muted-foreground">{rel.providerAccountId?.brokerName} {rel.providerAccountId?.login} → {rel.followerAccountId?.brokerName} {rel.followerAccountId?.login}</p>
                    </div>
                    <Badge variant={rel.status === "active" ? "success" : rel.status === "pending" ? "secondary" : "warning"}>{rel.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Lot x{rel.lotMultiplier} · {rel.copyManualTrades ? "manual" : ""}{rel.copyManualTrades && rel.copyWebhookSignals ? " + " : ""}{rel.copyWebhookSignals ? "webhook" : ""}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Top profitable MT5 traders</p>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {(copyTerminal?.topProviders ?? []).length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/[0.08] p-4 text-sm text-muted-foreground">No closed MT5 performance data yet.</p>
              ) : copyTerminal?.topProviders.map((provider) => (
                <div key={provider.userId} className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{provider.fullName || provider.email || provider.userId}</p>
                    <p className="text-xs text-muted-foreground">{provider.trades} trades · {provider.winRate}% win rate</p>
                  </div>
                  <span className={provider.profit >= 0 ? "font-semibold text-emerald-300" : "font-semibold text-red-300"}>
                    {provider.profit >= 0 ? "+" : ""}{provider.profit.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Connect form toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">
          Connected Accounts
          <span className="ml-1.5 text-white/30">({accounts.length})</span>
        </h3>
        <Button
          size="sm"
          variant={showConnectForm ? "outline" : "default"}
          className="gap-1.5"
          onClick={() => setShowConnectForm((v) => !v)}
        >
          <Plus className="h-3.5 w-3.5" />
          {showConnectForm ? "Cancel" : "Connect account"}
        </Button>
      </div>

      {/* Connect form */}
      {showConnectForm && (
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
          <h3 className="mb-4 font-display text-base font-bold">Connect MT5 Account</h3>

          <div className="space-y-4">
              {/* Broker search */}
            <div className="relative grid gap-3">
              <div className="grid gap-2">
                <Label>Find broker server</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={brokerName}
                    onChange={(e) => { setBrokerName(e.target.value); setSuggestionsOpen(true); }}
                    onFocus={() => setSuggestionsOpen(true)}
                    className="pl-10"
                    placeholder="Start typing broker name..."
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>MT5 server name</Label>
                <Input
                  value={serverName}
                  onChange={(e) => { setServerName(e.target.value); setSuggestionsOpen(true); }}
                  onFocus={() => setSuggestionsOpen(true)}
                  placeholder="Exact server name from MT5 app"
                  required
                />
              </div>

              {/* Broker suggestions dropdown */}
              {suggestionsOpen && brokerQuery.length >= 2 && (
                <div className="z-50 max-h-72 overflow-y-auto overscroll-contain rounded-2xl border border-white/[0.08] bg-[#08111a] p-2 shadow-2xl md:absolute md:left-0 md:right-0 md:top-[calc(100%+4px)]">
                  <div className="mb-1 flex items-center justify-between px-2 py-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Broker servers</span>
                    {searchingBrokers && <span className="text-[10px] text-cyan-300">Searching…</span>}
                  </div>
                  {brokerSuggestions.length > 0 ? (
                    brokerSuggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => chooseBroker(s)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
                      >
                        <span>
                          <span className="block text-sm font-semibold">{s.brokerName}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{s.serverName}</span>
                        </span>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                          /demo/i.test(s.serverName) ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"
                        }`}>
                          {/demo/i.test(s.serverName) ? "Demo" : "Real"}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-3 text-sm text-muted-foreground">
                      No results found. Try a different spelling or enter the exact server name.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Login / Account Number</Label>
                <Input
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="12345678"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              className="gap-2"
              disabled={!brokerName || !serverName || !login || !password || connectMutation.isPending}
              onClick={() => connectMutation.mutate()}
            >
              {connectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {connectMutation.isPending ? "Connecting…" : "Connect account"}
            </Button>
          </div>
        </div>
      )}

      {/* Accounts list */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-3xl border border-white/[0.08] bg-white/[0.02] py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
            <Server className="h-5 w-5" />
          </div>
          <p className="mt-3 font-semibold">No MT5 accounts connected yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Connect an account above to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {accounts.map((account) => (
            <div
              key={account._id}
              className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5"
            >
              {/* Account header */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold">{account.brokerName}</h3>
                    <Badge variant={statusTone(account.status)}>{account.status}</Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {/demo/i.test(account.serverName ?? account.accountType ?? '') ? 'demo' : 'real'}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {account.login} · {account.serverName}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    disabled={refreshMutation.isPending}
                    onClick={() => refreshMutation.mutate(account._id)}
                    title="Refresh account"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                    onClick={() => setDisconnectAccount(account)}
                    title="Disconnect account"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Account stats */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Balance</p>
                  <p className="mt-1 font-semibold">{formatMoney(account.balance, account.currency)}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Equity</p>
                  <p className="mt-1 font-semibold">{formatMoney(account.equity, account.currency)}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Sync</p>
                  <p className="mt-1 flex items-center gap-1.5 font-semibold">
                    {account.isSynchronized ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-amber-400" />
                    )}
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

              {/* Webhook token */}
              {account.webhookToken && (
                <div className="mt-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Webhook token</p>
                  <p className="mt-0.5 break-all font-mono text-xs text-white/60">{account.webhookToken}</p>
                </div>
              )}

              {/* Last error */}
              {account.lastError && (
                <p className="mt-3 rounded-2xl bg-amber-500/[0.08] px-3 py-2 text-sm text-amber-100">
                  {account.lastError}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Disconnect confirm */}
      <ConfirmDialog
        open={Boolean(disconnectAccount)}
        title="Disconnect MT5 account?"
        description={
          disconnectAccount
            ? `${disconnectAccount.brokerName} (${disconnectAccount.login}) will be removed from MetaApi and stop all automation.`
            : ""
        }
        confirmLabel="Disconnect"
        destructive
        loading={disconnectMutation.isPending}
        onOpenChange={(open) => !open && setDisconnectAccount(null)}
        onConfirm={() => disconnectAccount && disconnectMutation.mutate(disconnectAccount._id)}
      />
    </div>
  );
}
