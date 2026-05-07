"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Lock, Plus, RefreshCw, Trash2, Eye, EyeOff } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import {
  clampTradeAmountToCurrency,
  formatCurrency,
  getTradeAmountMinimum,
  getTradeAmountRequirement,
  supportedTradeCurrencies,
} from "@/lib/utils";
import { useFeatureAccess } from "@/hooks/use-feature-access";

interface IQAccount {
  _id: string;
  email: string;
  balance: number | null;
  currency: string | null;
  accountType: "REAL" | "PRACTICE";
  tradeAmount: number;
  martingaleEnabled: boolean;
  copyAdminEnabled?: boolean;
  lastConnected: string | null;
}

interface EOAccount {
  accountId: number;
  name: string;
  baseAmount: number;
  isDemo: boolean;
  copyAdminEnabled: boolean;
  copyTradingEnabled: boolean;
  demoBalance?: number;
  realBalance?: number;
  balance?: number;
  currency?: string;
}

interface BotStatus {
  botRunning: boolean;
  iqAccounts?: Array<{ email: string; connected: boolean; balance: number; currency: string }>;
}

const PLAN_LIMITS: Record<string, number> = { NONE: 0, STANDARD: 1, PRO: 1, VIP: 3 };

export function CopyTradingSettings() {
  const { isPro, plan } = useFeatureAccess();
  const queryClient = useQueryClient();

  const [showConnectForm, setShowConnectForm] = useState(false);
  const [connectEmail, setConnectEmail] = useState("");
  const [connectPassword, setConnectPassword] = useState("");
  const [showConnectPassword, setShowConnectPassword] = useState(false);
  const [connectAccountType, setConnectAccountType] = useState<"REAL" | "PRACTICE">("REAL");
  const [connectTradeCurrency, setConnectTradeCurrency] = useState<string>("USD");
  const [connectTradeAmount, setConnectTradeAmount] = useState(() => String(getTradeAmountMinimum("USD")));
  const [editAmountFor, setEditAmountFor] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [iqAccountToDisconnect, setIqAccountToDisconnect] = useState<IQAccount | null>(null);

  const accountLimit = PLAN_LIMITS[plan ?? "NONE"] ?? 1;

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<IQAccount[]>({
    queryKey: ["iq-accounts"],
    queryFn: async () => (await api.get("/user/iq-account")).data,
    enabled: isPro,
  });

  const { data: eoAccounts = [], isLoading: eoAccountsLoading } = useQuery<EOAccount[]>({
    queryKey: ["eo-accounts-copy"],
    queryFn: async () => {
      const res = await api.get("/user/eo-accounts");
      const raw = res.data?.accounts ?? res.data;
      return (Array.isArray(raw) ? raw : []) as EOAccount[];
    },
    enabled: isPro,
  });

  const { data: botStatus } = useQuery<BotStatus>({
    queryKey: ["bot-status"],
    queryFn: async () => (await api.get("/user/bot-status")).data,
    enabled: isPro,
    refetchInterval: 15000,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await api.get("/user/profile")).data,
    enabled: isPro,
  });

  const copyAdminEnabled: boolean = (profile as any)?.iqAccounts?.[0]?.copyAdminEnabled ?? false;

  const connectMutation = useMutation({
    mutationFn: () =>
      api.post("/user/iq-account", {
        email: connectEmail,
        password: connectPassword,
        accountType: connectAccountType,
        tradeCurrency: connectTradeCurrency,
        tradeAmount: Number(connectTradeAmount) || getTradeAmountMinimum(connectTradeCurrency),
      }),
    onSuccess: () => {
      toast.success("Account connected");
      setShowConnectForm(false);
      setConnectEmail("");
      setConnectPassword("");
      setConnectTradeCurrency("USD");
      setConnectTradeAmount(String(getTradeAmountMinimum("USD")));
      queryClient.invalidateQueries({ queryKey: ["iq-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bot-status"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to connect account"),
  });

  const disconnectMutation = useMutation({
    mutationFn: (email: string) => api.delete("/user/iq-account", { data: { email } }),
    onSuccess: () => {
      toast.success("Account disconnected");
      setIqAccountToDisconnect(null);
      queryClient.invalidateQueries({ queryKey: ["iq-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bot-status"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to disconnect"),
  });

  const updateAmountMutation = useMutation({
    mutationFn: ({ email, tradeAmount }: { email: string; tradeAmount: number }) =>
      api.put("/user/iq-account", { email, tradeAmount }),
    onSuccess: () => {
      toast.success("Trade amount updated");
      setEditAmountFor(null);
      queryClient.invalidateQueries({ queryKey: ["iq-accounts"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to update"),
  });

  const toggleMartingaleMutation = useMutation({
    mutationFn: ({ email, enabled }: { email: string; enabled: boolean }) =>
      api.put("/user/iq-account", { email, martingaleEnabled: enabled }),
    onMutate: async ({ email, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ["iq-accounts"] });
      const previous = queryClient.getQueryData<IQAccount[]>(["iq-accounts"]);
      queryClient.setQueryData<IQAccount[]>(["iq-accounts"], (old) =>
        old ? old.map((a) => a.email === email ? { ...a, martingaleEnabled: enabled } : a) : old
      );
      return { previous };
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["iq-accounts"], ctx.previous);
      toast.error(err?.response?.data?.message ?? "Failed to update");
    },
    onSuccess: () => {
      toast.success("Martingale updated");
      queryClient.invalidateQueries({ queryKey: ["iq-accounts"] });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: (email: string) => api.post("/user/iq-account/refresh", { email }),
    onSuccess: () => {
      toast.success("Balance refreshed");
      queryClient.invalidateQueries({ queryKey: ["iq-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bot-status"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to refresh"),
  });

  const copyAdminMutation = useMutation({
    mutationFn: (enabled: boolean) => api.put("/user/copy-admin", { enabled }),
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: ["profile"] });
      const previous = queryClient.getQueryData<any>(["profile"]);
      queryClient.setQueryData<any>(["profile"], (old: any) => {
        if (!old?.iqAccounts?.length) return old;
        return {
          ...old,
          iqAccounts: old.iqAccounts.map((acc: any, i: number) =>
            i === 0 ? { ...acc, copyAdminEnabled: enabled } : acc
          ),
        };
      });
      return { previous };
    },
    onError: (error: unknown, _enabled, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["profile"], ctx.previous);
      toast.error(error instanceof Error && error.message ? error.message : "Failed to update");
    },
    onSuccess: (_data, enabled) => {
      toast.success(enabled ? "Copy admin trading enabled" : "Copy admin trading disabled");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  // EO copy-admin toggle per account
  const eoCopyAdminMutation = useMutation({
    mutationFn: ({ accountId, enabled }: { accountId: number; enabled: boolean }) =>
      api.put("/user/eo-copy-admin", { enabled, accountId: String(accountId) }),
    onMutate: async ({ accountId, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ["eo-accounts-copy"] });
      const previous = queryClient.getQueryData<EOAccount[]>(["eo-accounts-copy"]);
      queryClient.setQueryData<EOAccount[]>(["eo-accounts-copy"], (old = []) =>
        old.map((a) => a.accountId === accountId ? { ...a, copyAdminEnabled: enabled } : a)
      );
      return { previous };
    },
    onError: (error: unknown, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["eo-accounts-copy"], ctx.previous);
      const msg = (error as any)?.response?.data?.message ?? (error instanceof Error ? error.message : null);
      toast.error(msg || "Failed to update EO copy trading");
    },
    onSuccess: (_data, { enabled }) => {
      toast.success(enabled ? "EO copy admin trading enabled" : "EO copy admin trading disabled");
      queryClient.invalidateQueries({ queryKey: ["eo-accounts-copy"] });
    },
  });

  if (!isPro) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Copy Trading</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Mirror trades from the admin automatically.</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <Lock className="mb-3 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Pro or VIP plan required</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Upgrade your plan to unlock copy trading.</p>
          <Button asChild size="sm" variant="outline" className="mt-4">
            <Link href="/dashboard/subscription">View plans</Link>
          </Button>
        </div>
      </div>
    );
  }

  const canAddMore = accounts.length < accountLimit;
  const botRunning = botStatus?.botRunning ?? false;
  const connectAmountMinimum = getTradeAmountMinimum(connectTradeCurrency);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Copy Trading</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Mirror trades from the admin automatically.</p>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${botRunning ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.04] text-white/40"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${botRunning ? "animate-pulse bg-emerald-400" : "bg-white/20"}`} />
          {botRunning ? "Bot running" : "Bot stopped"}
        </div>
      </div>

      {/* Copy-Admin Toggle */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">Copy Admin Trades</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              When enabled, your bot mirrors trades placed manually by the admin.
            </p>
          </div>
          <Switch
            checked={copyAdminEnabled}
            onCheckedChange={(checked) => copyAdminMutation.mutate(checked)}
            disabled={copyAdminMutation.isPending}
          />
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-0.5">
              <Image src="/autobot-assets/iq-option-small.svg" alt="IQ Option" width={20} height={20} className="h-full w-full object-contain" />
            </div>
            <h2 className="text-sm font-semibold text-white/70">
              IQ Option Accounts{" "}
              <span className="text-white/30">({accounts.length}/{accountLimit})</span>
            </h2>
          </div>
          {canAddMore && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowConnectForm(!showConnectForm)}>
              <Plus className="h-3.5 w-3.5" /> Add account
            </Button>
          )}
        </div>

        {accountsLoading && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center text-sm text-muted-foreground">
            Loading accounts…
          </div>
        )}

        {!accountsLoading && accounts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
            <p className="text-sm text-muted-foreground">No IQ Option accounts connected yet.</p>
            <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => setShowConnectForm(true)}>
              <Plus className="h-3.5 w-3.5" /> Connect account
            </Button>
          </div>
        )}

        {accounts.map((account) => {
          const liveAccount = botStatus?.iqAccounts?.find((a) => a.email === account.email);
          const balance = liveAccount?.balance ?? account.balance;
          const currency = liveAccount?.currency ?? account.currency;
          const isEditing = editAmountFor === account.email;

          return (
            <div key={account._id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{account.email}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={account.accountType === "REAL" ? "default" : "outline"} className="text-[10px]">
                      {account.accountType === "REAL" ? "Real" : "Practice"}
                    </Badge>
                    {balance != null && (
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(Number(balance), currency)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7"
                    title="Refresh balance"
                    onClick={() => refreshMutation.mutate(account.email)}
                    disabled={refreshMutation.isPending}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                    title="Disconnect"
                    onClick={() => setIqAccountToDisconnect(account)}
                    disabled={disconnectMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-3 border-t border-white/[0.04] pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Trade amount</span>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        className="h-7 w-24 text-xs"
                        type="number"
                        min={getTradeAmountMinimum(currency)}
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                      />
                      <Button
                        size="sm" className="h-7 px-2 text-xs"
                        onClick={() => updateAmountMutation.mutate({ email: account.email, tradeAmount: Number(editAmount) })}
                        disabled={updateAmountMutation.isPending || Number(editAmount) < getTradeAmountMinimum(currency)}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditAmountFor(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditAmountFor(account.email); setEditAmount(String(account.tradeAmount)); }}
                      className="text-xs font-semibold text-white transition-colors hover:text-primary"
                    >
                      {formatCurrency(account.tradeAmount, currency)} <span className="text-white/30">(edit)</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Martingale</span>
                  <Switch
                    checked={account.martingaleEnabled}
                    onCheckedChange={(checked) => toggleMartingaleMutation.mutate({ email: account.email, enabled: checked })}
                    disabled={toggleMartingaleMutation.isPending}
                  />
                </div>
              </div>
            </div>
          );
        })}

        <ConfirmDialog
          open={Boolean(iqAccountToDisconnect)}
          onOpenChange={(open) => { if (!open) setIqAccountToDisconnect(null); }}
          title="Disconnect IQ account?"
          description={`Disconnect ${iqAccountToDisconnect?.email ?? "this account"} from copy trading.`}
          confirmLabel="Disconnect"
          destructive
          loading={disconnectMutation.isPending}
          onConfirm={() => {
            if (iqAccountToDisconnect) disconnectMutation.mutate(iqAccountToDisconnect.email);
          }}
        />
      </div>

      {/* Connect form */}
      {showConnectForm && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Connect IQ Option Account</h3>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input placeholder="iq@example.com" value={connectEmail} onChange={(e) => setConnectEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Password</Label>
              <div className="relative">
                <Input
                  type={showConnectPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pr-12"
                  value={connectPassword}
                  onChange={(e) => setConnectPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={showConnectPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowConnectPassword((v) => !v)}
                >
                  {showConnectPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Account type</Label>
              <div className="flex gap-2">
                {(["REAL", "PRACTICE"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setConnectAccountType(t)}
                    className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-colors ${
                      connectAccountType === t
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-white/[0.06] text-muted-foreground hover:border-white/20"
                    }`}
                  >
                    {t === "REAL" ? "Real" : "Practice"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Trade currency</Label>
              <select
                className="flex h-11 w-full rounded-2xl border border-input bg-background/70 px-4 text-sm text-foreground"
                value={connectTradeCurrency}
                onChange={(e) => {
                  const nextCurrency = e.target.value;
                  setConnectTradeCurrency(nextCurrency);
                  setConnectTradeAmount((currentAmount) => String(clampTradeAmountToCurrency(Number(currentAmount), nextCurrency)));
                }}
              >
                {supportedTradeCurrencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Base trade amount</Label>
              <Input type="number" min={connectAmountMinimum} placeholder={String(connectAmountMinimum)} value={connectTradeAmount} onChange={(e) => setConnectTradeAmount(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">{getTradeAmountRequirement(connectTradeCurrency)}</p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowConnectForm(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => connectMutation.mutate()}
                disabled={!connectEmail || !connectPassword || connectMutation.isPending || Number(connectTradeAmount) < connectAmountMinimum}
              >
                {connectMutation.isPending ? "Connecting…" : "Connect"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── ExpertOption Copy Trading ─────────────────────────────────── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
            <Image src="/autobot-assets/experoptionlogo.png" alt="ExpertOption" width={24} height={24} className="h-6 w-6 object-contain" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">ExpertOption Copy Trading</h2>
            <p className="text-[11px] text-muted-foreground">Mirror admin EO trades on your connected Expert Option accounts.</p>
          </div>
        </div>

        {eoAccountsLoading ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center text-sm text-muted-foreground">
            Loading EO accounts…
          </div>
        ) : eoAccounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
            <p className="text-sm text-muted-foreground">No Expert Option accounts connected.</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Connect an EO account from the Accounts page to enable copy trading.</p>
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link href="/dashboard/accounts?broker=eo">Connect EO Account</Link>
            </Button>
          </div>
        ) : (
          eoAccounts.map((account) => {
            const balance = account.isDemo
              ? (account.demoBalance ?? account.balance)
              : (account.realBalance ?? account.balance);
            return (
              <div key={account.accountId} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
                      <Image src="/autobot-assets/experoptionlogo.png" alt="EO" width={24} height={24} className="h-6 w-6 object-contain" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {account.name || `Account #${account.accountId}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        ID: {account.accountId}
                        {balance != null && ` · Balance: ${formatCurrency(balance, account.currency ?? "USD")}`}
                        {` · ${account.isDemo ? "Demo" : "Real"} · $${account.baseAmount}/trade`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`text-xs font-medium ${account.copyAdminEnabled ? "text-emerald-400" : "text-muted-foreground"}`}>
                      {account.copyAdminEnabled ? "On" : "Off"}
                    </span>
                    <Switch
                      checked={account.copyAdminEnabled}
                      onCheckedChange={(checked) =>
                        eoCopyAdminMutation.mutate({ accountId: account.accountId, enabled: checked })
                      }
                      disabled={eoCopyAdminMutation.isPending}
                    />
                  </div>
                </div>
                {account.copyAdminEnabled && (
                  <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-[11px] text-emerald-300">
                    Copy trading active — this account will mirror admin EO trades automatically.
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
