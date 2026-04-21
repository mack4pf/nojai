"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Eye, EyeOff, Loader2, Plus, RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react";
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
  formatCurrencyBreakdown,
  getTradeAmountMinimum,
  getTradeAmountRequirement,
  normalizeCurrencyCode,
  supportedTradeCurrencies,
} from "@/lib/utils";

interface SubAccount {
  email: string;
  isConnected: boolean;
  balance: number;
  currency: string;
  tradeAmount: number;
  martingaleStep: number;
  accountType?: "REAL" | "PRACTICE";
  isMain?: boolean;
  tradeInFlight?: boolean;
}

interface CopyTradeStatus {
  copyTradeEnabled: boolean;
  mainAccountEmail: string | null;
  copyVipSignals: boolean;
  copyProSignals: boolean;
  connectedCount?: number;
  mainAccount?: SubAccount | null;
  subAccountCount: number;
  subAccounts: SubAccount[];
}

const QUERY_KEY = ["admin-copy-trade"];

type CopyTradeUpdatePayload = {
  enabled?: boolean;
  mainAccountEmail?: string;
  copyVipSignals?: boolean;
  copyProSignals?: boolean;
};

function getSignalSummary(copyVipSignals: boolean, copyProSignals: boolean) {
  if (copyVipSignals && copyProSignals) return "VIP + PRO";
  if (copyVipSignals) return "VIP only";
  if (copyProSignals) return "PRO only";
  return "Signals disabled";
}

export function AdminCopyTradeManager() {
  const queryClient = useQueryClient();
  const getErrorMessage = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

  // â”€â”€ Connect form state â”€â”€
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [accountType, setAccountType] = useState<"REAL" | "PRACTICE">("REAL");
  const [tradeCurrency, setTradeCurrency] = useState<string>("USD");
  const [tradeAmount, setTradeAmount] = useState(() => getTradeAmountMinimum("USD"));

  // â”€â”€ Set-all-amount modal state â”€â”€
  const [showSetAll, setShowSetAll] = useState(false);
  const [allCurrency, setAllCurrency] = useState("USD");
  const [allAmount, setAllAmount] = useState(() => getTradeAmountMinimum("USD"));

  // â”€â”€ Inline amount edit state â”€â”€
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState(10);

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => (await api.get<CopyTradeStatus>("/admin/copy-trade")).data,
    refetchInterval: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: async (payload: CopyTradeUpdatePayload) =>
      (await api.put<Pick<CopyTradeStatus, "copyTradeEnabled" | "mainAccountEmail" | "copyVipSignals" | "copyProSignals">>("/admin/copy-trade", payload)).data,
    onMutate: async (payload: CopyTradeUpdatePayload) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previousStatus = queryClient.getQueryData<CopyTradeStatus>(QUERY_KEY);

      if (previousStatus) {
        const nextMainAccountEmail = payload.mainAccountEmail ?? previousStatus.mainAccountEmail;
        const nextMainAccount = nextMainAccountEmail
          ? previousStatus.subAccounts.find((account) => account.email === nextMainAccountEmail) ?? previousStatus.mainAccount ?? null
          : previousStatus.mainAccount ?? null;

        queryClient.setQueryData<CopyTradeStatus>(QUERY_KEY, {
          ...previousStatus,
          copyTradeEnabled: payload.enabled ?? previousStatus.copyTradeEnabled,
          mainAccountEmail: nextMainAccountEmail,
          mainAccount: nextMainAccount,
          copyVipSignals: payload.copyVipSignals ?? previousStatus.copyVipSignals,
          copyProSignals: payload.copyProSignals ?? previousStatus.copyProSignals,
        });
      }

      return { previousStatus };
    },
    onSuccess: (result) => {
      queryClient.setQueryData<CopyTradeStatus>(QUERY_KEY, (current) => current ? {
        ...current,
        copyTradeEnabled: result.copyTradeEnabled ?? current.copyTradeEnabled,
        mainAccountEmail: result.mainAccountEmail ?? current.mainAccountEmail,
        copyVipSignals: result.copyVipSignals ?? current.copyVipSignals,
        copyProSignals: result.copyProSignals ?? current.copyProSignals,
      } : current);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Copy-trade settings updated");
    },
    onError: (error: unknown, _payload, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(QUERY_KEY, context.previousStatus);
      }

      toast.error(getErrorMessage(error, "Failed to update copy-trade settings"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const connectMutation = useMutation({
    mutationFn: async () =>
      (await api.post("/admin/copy-trade/connect", { email, password, accountType, tradeAmount, tradeCurrency })).data,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success(`${res.account?.email ?? "Account"} connected`);
      setEmail(""); setPassword("");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to connect account")),
  });

  const refreshMutation = useMutation({
    mutationFn: async (accountEmail?: string) =>
      (await api.post("/admin/copy-trade/refresh", accountEmail ? { email: accountEmail } : {})).data,
    onSuccess: (_res, accountEmail) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success(accountEmail ? "Account refreshed" : "Accounts refreshed");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to refresh accounts")),
  });

  const disconnectMutation = useMutation({
    mutationFn: async (acEmail: string) =>
      (await api.delete("/admin/copy-trade/disconnect", { data: { email: acEmail } })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Account disconnected");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to disconnect account")),
  });

  const setAllMutation = useMutation({
    mutationFn: async () =>
      (await api.put("/admin/copy-trade/set-all-amount", { currency: allCurrency, amount: allAmount })).data,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(res.message ?? "Amounts updated");
      setShowSetAll(false);
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to update amounts")),
  });

  const setAmountMutation = useMutation({
    mutationFn: async ({ acEmail, amount }: { acEmail: string; amount: number }) =>
      (await api.put("/admin/copy-trade/set-amount", { email: acEmail, amount })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Amount updated");
      setEditingEmail(null);
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to update amount")),
  });

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Failed to load copy-trade status
      </div>
    );
  }

  const mainAccount = data?.mainAccount ?? null;
  const canEnableCopyTrade = Boolean(mainAccount?.email && mainAccount.isConnected);
  const accounts = data?.subAccounts ?? [];
  const connectedCount = data?.connectedCount ?? accounts.filter((account) => account.isConnected).length;
  const copyVipSignals = data?.copyVipSignals ?? true;
  const copyProSignals = data?.copyProSignals ?? false;
  const signalSummary = getSignalSummary(copyVipSignals, copyProSignals);
  const additionalAccounts = accounts.filter((account) => !account.isMain);
  const currencies = [...new Set(accounts.map((account) => normalizeCurrencyCode(account.currency)).filter(Boolean))] as string[];
  const availableCurrencies = currencies.length > 0 ? currencies : [...supportedTradeCurrencies];
  const connectAmountMinimum = getTradeAmountMinimum(tradeCurrency);
  const setAllAmountMinimum = getTradeAmountMinimum(allCurrency);
  const balanceSummary = formatCurrencyBreakdown(accounts.map((account) => ({ currency: account.currency, amount: account.balance })));

  return (
    <div className="space-y-6">
      {/* â”€â”€ Status card â”€â”€ */}
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`h-3 w-3 rounded-full ${data?.copyTradeEnabled ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-white/20"}`} />
            <div>
              <h3 className="font-display text-lg font-bold">Enable Copy Trading</h3>
              <p className="text-xs text-muted-foreground">
                {data?.copyTradeEnabled ? `Live · ${signalSummary}` : "Disabled"}
              </p>
            </div>
          </div>
          <Switch
            checked={data?.copyTradeEnabled ?? false}
            onCheckedChange={(enabled) => {
              if (enabled) {
                if (!mainAccount?.email) {
                  toast.error("Connect a main admin account before enabling copy-trade.");
                  return;
                }

                if (!mainAccount.isConnected) {
                  toast.error("Refresh or reconnect the main account before enabling copy-trade.");
                  return;
                }

                toggleMutation.mutate({ enabled: true, mainAccountEmail: mainAccount.email });
                return;
              }

              toggleMutation.mutate({ enabled: false });
            }}
            disabled={toggleMutation.isPending || (!(data?.copyTradeEnabled ?? false) && !canEnableCopyTrade)}
          />
        </div>

        {!(data?.copyTradeEnabled ?? false) && !canEnableCopyTrade ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Connect and refresh the main account before turning copy-trade on.
          </p>
        ) : null}

        {data?.mainAccountEmail && (
          <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Main Account</p>
                <p className="mt-1 font-medium text-white">{data.mainAccount?.email ?? data.mainAccountEmail}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.mainAccount?.accountType ?? "REAL"} · {formatCurrency(data.mainAccount?.tradeAmount ?? 0, data.mainAccount?.currency)} per trade
                </p>
              </div>
              <Badge variant={data.mainAccount?.isConnected ? "success" : "warning"} className="text-[10px]">
                {data.mainAccount?.isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* â”€â”€ Summary stats â”€â”€ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["All accounts", accounts.length],
          ["Connected", connectedCount],
          ["Balances", balanceSummary],
          ["Additional", additionalAccounts.length],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold">Connected Account Network</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {connectedCount} live · {accounts.length} total · {currencies.join(", ") || "No currencies yet"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={data?.mainAccount?.isConnected ? "success" : "warning"} className="text-[10px]">
              {data?.mainAccount?.isConnected ? "Main live" : "Main offline"}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => refreshMutation.mutate(undefined)} disabled={refreshMutation.isPending}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
              Refresh accounts
            </Button>
          </div>
        </div>
      </div>

      {/* â”€â”€ Connect sub-account form â”€â”€ */}
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
        <h3 className="font-display text-base font-bold">{data?.mainAccount ? "Connect Sub-Account" : "Connect Main Account"}</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ct-email">IQ Option Email</Label>
            <Input id="ct-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="trader@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ct-password">Password</Label>
            <div className="relative">
              <Input
                id="ct-password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ct-type">Account Type</Label>
            <select
              id="ct-type"
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-foreground focus:outline-none"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as "REAL" | "PRACTICE")}
            >
              <option value="REAL">Real</option>
              <option value="PRACTICE">Practice</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ct-currency">Trade Currency</Label>
            <select
              id="ct-currency"
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-foreground focus:outline-none"
              value={tradeCurrency}
              onChange={(e) => {
                const nextCurrency = e.target.value;
                setTradeCurrency(nextCurrency);
                setTradeAmount((currentAmount) => clampTradeAmountToCurrency(currentAmount, nextCurrency));
              }}
            >
              {supportedTradeCurrencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ct-amount">Trade Amount</Label>
            <Input
              id="ct-amount"
              type="number"
              min={connectAmountMinimum}
              value={tradeAmount}
              onChange={(e) => setTradeAmount(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">{getTradeAmountRequirement(tradeCurrency)}</p>
          </div>
        </div>
        <Button
          className="mt-4"
          disabled={!email || !password || tradeAmount < connectAmountMinimum || connectMutation.isPending}
          onClick={() => connectMutation.mutate()}
        >
          {connectMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Connect Account
        </Button>
      </div>

      {/* â”€â”€ Sub-accounts table â”€â”€ */}
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-base font-bold">Connected Accounts ({accounts.length})</h3>
          <Button variant="outline" size="sm" onClick={() => setShowSetAll(true)}>
            Set All Amounts
          </Button>
        </div>

        {accounts.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">No admin accounts connected yet. Connect an account first to enable signal copying.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.05] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 text-left">Email</th>
                  <th className="pb-2 text-left">Status</th>
                  <th className="pb-2 text-right">Balance</th>
                  <th className="pb-2 text-right">Amount</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {accounts.map((acc) => (
                  <tr key={acc.email}>
                    <td className="py-3 font-medium text-white">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{acc.email}</span>
                        {acc.isMain ? <Badge variant="secondary" className="text-[9px]">Main</Badge> : <Badge variant="outline" className="text-[9px]">Sub</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{normalizeCurrencyCode(acc.currency)} · {acc.accountType ?? "REAL"}</p>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {acc.isConnected
                          ? <><Wifi className="h-3.5 w-3.5 text-emerald-400" /><Badge variant="success" className="text-[10px]">Connected</Badge></>
                          : <><WifiOff className="h-3.5 w-3.5 text-red-400" /><Badge variant="warning" className="text-[10px]">Disconnected</Badge></>}
                        {acc.tradeInFlight ? <Badge className="text-[10px]">In flight</Badge> : null}
                      </div>
                    </td>
                    <td className="py-3 text-right">{formatCurrency(acc.balance, acc.currency)}</td>
                    <td className="py-3 text-right">
                      {editingEmail === acc.email ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            min={getTradeAmountMinimum(acc.currency)}
                            className="h-7 w-20 text-xs"
                            value={editAmount}
                            onChange={(e) => setEditAmount(Number(e.target.value))}
                          />
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setAmountMutation.mutate({ acEmail: acc.email, amount: editAmount })}
                            disabled={setAmountMutation.isPending || editAmount < getTradeAmountMinimum(acc.currency)}
                          >
                            Save
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setEditingEmail(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="text-sm hover:underline"
                          onClick={() => { setEditingEmail(acc.email); setEditAmount(acc.tradeAmount); }}
                        >
                          {formatCurrency(acc.tradeAmount, acc.currency)}
                        </button>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => refreshMutation.mutate(acc.email)}
                          disabled={refreshMutation.isPending}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs text-red-400 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                          onClick={() => disconnectMutation.mutate(acc.email)}
                          disabled={disconnectMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* â”€â”€ Set-all-amount modal â”€â”€ */}
      {showSetAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSetAll(false)}>
          <div className="w-80 rounded-3xl border border-white/[0.08] bg-[#0a0a14] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-base font-bold">Set All Amounts</h3>
            <p className="mt-1 text-xs text-muted-foreground">Update trade amount for all accounts of a specific currency.</p>
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <select
                  className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-foreground focus:outline-none"
                  value={allCurrency}
                  onChange={(e) => {
                    const nextCurrency = e.target.value;
                    setAllCurrency(nextCurrency);
                    setAllAmount((currentAmount) => clampTradeAmountToCurrency(currentAmount, nextCurrency));
                  }}
                >
                  {availableCurrencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input type="number" min={setAllAmountMinimum} value={allAmount} onChange={(e) => setAllAmount(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">{getTradeAmountRequirement(allCurrency)}</p>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowSetAll(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => setAllMutation.mutate()} disabled={setAllMutation.isPending || allAmount < setAllAmountMinimum}>
                {setAllMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
