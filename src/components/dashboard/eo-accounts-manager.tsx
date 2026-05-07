"use client";

import { useState } from "react";
import Image from "next/image";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Eye, EyeOff, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency } from "@/lib/utils";
import type { EOAccount, PlanTier, UserProfile } from "@/types";

interface EOAccountsManagerProps {
  profile: UserProfile | null | undefined;
}

export function EOAccountsManager({ profile }: EOAccountsManagerProps) {
  const queryClient = useQueryClient();

  const activePlan: PlanTier =
    profile?.subscription?.active ? profile.subscription.plan : (profile?.plan ?? "NONE");
  const accountLimit = activePlan === "VIP" ? 3 : 1;

  // Fetch EO accounts
  const { data: accounts = [], isLoading } = useQuery<EOAccount[]>({
    queryKey: queryKeys.eoAccounts,
    queryFn: async () => {
      const res = await api.get("/user/eo-accounts");
      return (res.data.accounts ?? res.data ?? []) as EOAccount[];
    },
    enabled: activePlan !== "NONE",
  });

  // Connect form state
  // Restore saved token from localStorage if available
  const [token, setToken] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("eo_token_draft") ?? "";
    return "";
  });
  const [baseAmount, setBaseAmount] = useState(10);
  const [isDemo, setIsDemo] = useState(true);
  const [proxy, setProxy] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);

  // Persist token draft so user doesn't lose it
  function handleTokenChange(value: string) {
    setToken(value);
    if (typeof window !== "undefined") {
      if (value) localStorage.setItem("eo_token_draft", value);
      else localStorage.removeItem("eo_token_draft");
    }
  }

  // Live balance state (updated by socket)
  const [liveBalances, setLiveBalances] = useState<
    Record<number, { demoBalance?: number; realBalance?: number }>
  >({});

  function getDisplayBalance(account: EOAccount) {
    const live = liveBalances[account.accountId];
    const demo = live?.demoBalance ?? account.demoBalance;
    const real = live?.realBalance ?? account.realBalance;
    return account.isDemo ? demo : real;
  }

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { token, baseAmount, isDemo };
      if (proxy.trim()) body.proxy = proxy.trim();
      return (await api.post("/user/eo-account/connect", body)).data;
    },
    onSuccess: () => {
      toast.success("Expert Option account connected successfully");
      setToken("");
      localStorage.removeItem("eo_token_draft");
      setBaseAmount(10);
      setIsDemo(true);
      setProxy("");
      setShowConnectForm(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.eoAccounts });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to connect account"),
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (accountId: number) => {
      await api.delete(`/user/eo-account/${accountId}`);
    },
    onSuccess: () => {
      toast.success("Expert Option account disconnected");
      queryClient.invalidateQueries({ queryKey: queryKeys.eoAccounts });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to disconnect"),
  });

  // Switch mode mutation
  const modeMutation = useMutation({
    mutationFn: async ({ accountId, isDemo }: { accountId: number; isDemo: boolean }) => {
      await api.patch(`/user/eo-account/${accountId}/mode`, { isDemo });
    },
    onSuccess: () => {
      toast.success("Mode switched");
      queryClient.invalidateQueries({ queryKey: queryKeys.eoAccounts });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to switch mode"),
  });

  // Update base amount mutation
  const baseAmountMutation = useMutation({
    mutationFn: async ({ accountId, baseAmount }: { accountId: number; baseAmount: number }) => {
      await api.patch(`/user/eo-account/${accountId}/base-amount`, { baseAmount });
    },
    onSuccess: () => {
      toast.success("Base amount updated");
      queryClient.invalidateQueries({ queryKey: queryKeys.eoAccounts });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update base amount"),
  });

  // Copy trading mutation removed — handled on /dashboard/copy-trading page

  // Refresh balance mutation
  const refreshMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const res = await api.post(`/user/eo-account/${accountId}/refresh-balance`);
      return res.data as { demoBalance: number; realBalance: number };
    },
    onSuccess: (data, accountId) => {
      toast.success("Balance refreshed");
      setLiveBalances((prev) => ({
        ...prev,
        [accountId]: { demoBalance: data.demoBalance, realBalance: data.realBalance },
      }));
      queryClient.invalidateQueries({ queryKey: queryKeys.eoAccounts });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to refresh balance"),
  });

  // Reconnect mutation — uses stored token, no manual input needed
  const reconnectMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const res = await api.post(`/user/eo-account/${accountId}/reconnect`);
      return res.data;
    },
    onSuccess: (data, accountId) => {
      toast.success("Account reconnected successfully");
      if (data?.account) {
        setLiveBalances((prev) => ({
          ...prev,
          [accountId]: {
            demoBalance: data.account.demoBalance,
            realBalance: data.account.realBalance,
          },
        }));
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.eoAccounts });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? err.message ?? "Failed to reconnect account"),
  });

  // Per-account draft base amounts
  const [draftAmounts, setDraftAmounts] = useState<Record<number, number>>({});

  const canAddMore = activePlan !== "NONE" && accounts.length < accountLimit;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="dashboard-solid-panel flex flex-col gap-2 rounded-2xl border border-[#1565c0]/25 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5">
            <Image src="/autobot-assets/experoptionlogo.png" alt="Expert Option" width={32} height={32} className="h-7 w-7 object-contain" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Expert Option</h2>
            <p className="text-[11px] text-muted-foreground">
              {accounts.length}/{accountLimit} accounts connected
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={accounts.length > 0 ? "success" : "secondary"}>
            {accounts.length > 0 ? "Active" : "No accounts"}
          </Badge>
          {canAddMore && (
            <Button size="sm" variant="outline" onClick={() => setShowConnectForm((v) => !v)}>
              {showConnectForm ? "Cancel" : "+ Connect"}
            </Button>
          )}
        </div>
      </div>

      {/* Connect form */}
      {showConnectForm && (
        <div className="dashboard-solid-panel rounded-2xl border border-[#1565c0]/25 bg-white/[0.02] p-4 space-y-4">
          <h3 className="text-sm font-semibold">Connect Expert Option Account</h3>

          {/* How to get token */}
          <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3">
            <button
              type="button"
              className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              onClick={() => setShowHowTo((v) => !v)}
            >
              How to get your token
              {showHowTo ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showHowTo && (
              <ol className="mt-2 space-y-1.5 text-[11px] text-muted-foreground">
                <li className="flex gap-2"><span className="font-bold text-primary">1.</span> Go to <span className="font-medium text-foreground">expertoption.com</span> and log in</li>
                <li className="flex gap-2"><span className="font-bold text-primary">2.</span> Press <span className="font-medium text-foreground">F12</span> to open DevTools</li>
                <li className="flex gap-2"><span className="font-bold text-primary">3.</span> Go to <span className="font-medium text-foreground">Application → Cookies</span></li>
                <li className="flex gap-2"><span className="font-bold text-primary">4.</span> Find and copy the value of the <span className="font-medium text-foreground">token</span> cookie</li>
              </ol>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Token *</Label>
              <div className="relative">
                <Input
                  type={showToken ? "text" : "password"}
                  placeholder="Paste your Expert Option token here"
                  value={token}
                  onChange={(e) => handleTokenChange(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowToken((v) => !v)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Base Trade Amount *</Label>
              <Input
                type="number"
                min={1}
                value={baseAmount}
                onChange={(e) => setBaseAmount(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Mode</Label>
              <div className="flex h-11 items-center justify-between rounded-2xl border border-input bg-background/70 px-4">
                <span className="text-sm">{isDemo ? "Demo" : "Real"}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Real</span>
                  <Switch checked={!isDemo} onCheckedChange={(v) => setIsDemo(!v)} />
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Proxy URL <span className="text-muted-foreground">(optional, for restricted regions)</span></Label>
              <Input
                type="text"
                placeholder="http://user:pass@proxy.host:port"
                value={proxy}
                onChange={(e) => setProxy(e.target.value)}
              />
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => connectMutation.mutate()}
            disabled={connectMutation.isPending || !token.trim() || token.length < 10 || baseAmount < 1}
          >
            {connectMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting…</>
            ) : (
              "Connect Account"
            )}
          </Button>
        </div>
      )}

      {/* Account cards */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-white/[0.06] py-10">
          <p className="text-sm text-muted-foreground">Loading EO accounts…</p>
        </div>
      ) : accounts.length === 0 && !showConnectForm ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-10 text-center">
          <p className="text-sm text-muted-foreground">No Expert Option accounts connected</p>
          {activePlan === "NONE" ? (
            <p className="mt-1 text-xs text-muted-foreground/60">Subscribe to connect an Expert Option account.</p>
          ) : (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowConnectForm(true)}>
              + Connect Account
            </Button>
          )}
        </div>
      ) : (
        accounts.map((account) => {
          const draftBaseAmount = draftAmounts[account.accountId] ?? account.baseAmount;
          const displayBalance = getDisplayBalance(account);
          const demoBalance = liveBalances[account.accountId]?.demoBalance ?? account.demoBalance;
          const realBalance = liveBalances[account.accountId]?.realBalance ?? account.realBalance;

          return (
            <div key={account.accountId} className="dashboard-solid-panel rounded-2xl border border-[#1565c0]/25 bg-white/[0.02] p-4 space-y-3">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5">
                    <Image src="/autobot-assets/experoptionlogo.png" alt="Expert Option" width={32} height={32} className="h-7 w-7 object-contain" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{account.name || `Account #${account.accountId}`}</p>
                    <p className="text-[11px] text-muted-foreground">ID: {account.accountId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Always show as Connected — backend auto-reconnects */}
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <Badge variant="success">Connected</Badge>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="dashboard-solid-panel rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Balance</p>
                  <p className="mt-1 font-display text-base font-semibold">
                    {displayBalance != null ? formatCurrency(displayBalance, account.currency ?? "USD") : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{account.isDemo ? "Demo" : "Real"}</p>
                </div>
                <div className="dashboard-solid-panel rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Demo</p>
                  <p className="mt-1 text-sm font-semibold">
                    {demoBalance != null ? formatCurrency(demoBalance, account.currency ?? "USD") : "—"}
                  </p>
                </div>
                <div className="dashboard-solid-panel rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Real</p>
                  <p className="mt-1 text-sm font-semibold">
                    {realBalance != null ? formatCurrency(realBalance, account.currency ?? "USD") : "—"}
                  </p>
                </div>
                <div className="dashboard-solid-panel rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Base Amount</p>
                  <p className="mt-1 text-sm font-semibold">{formatCurrency(account.baseAmount, account.currency ?? "USD")}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="border-t border-white/5 pt-3">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">Settings</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* Demo/Real toggle */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Mode</Label>
                    <div className="flex h-11 items-center justify-between rounded-2xl border border-input bg-background/70 px-4">
                      <span className="text-sm">{account.isDemo ? "Demo" : "Real"}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Real</span>
                        <Switch
                          checked={!account.isDemo}
                          onCheckedChange={(v) =>
                            modeMutation.mutate({ accountId: account.accountId, isDemo: !v })
                          }
                          disabled={modeMutation.isPending}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Base amount */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Base Amount</Label>
                    <Input
                      type="number"
                      min={1}
                      value={draftBaseAmount}
                      onChange={(e) =>
                        setDraftAmounts((prev) => ({
                          ...prev,
                          [account.accountId]: Number(e.target.value),
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        baseAmountMutation.mutate({ accountId: account.accountId, baseAmount: draftBaseAmount })
                      }
                      disabled={baseAmountMutation.isPending || draftBaseAmount < 1}
                    >
                      {baseAmountMutation.isPending ? "Saving…" : "Save Amount"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 border-t border-white/5 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshMutation.mutate(account.accountId)}
                  disabled={refreshMutation.isPending}
                >
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                  Refresh Balance
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reconnectMutation.mutate(account.accountId)}
                  disabled={reconnectMutation.isPending}
                  title="Reconnect using your stored token"
                >
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${reconnectMutation.isPending ? "animate-spin" : ""}`} />
                  {reconnectMutation.isPending ? "Reconnecting…" : "Reconnect"}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (confirm("Disconnect this Expert Option account?")) {
                      disconnectMutation.mutate(account.accountId);
                    }
                  }}
                  disabled={disconnectMutation.isPending}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Disconnect
                </Button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// end of EOAccountsManager
