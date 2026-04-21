"use client";

import { useState } from "react";
import Image from "next/image";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Info, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api, normalizeUserProfile } from "@/lib/api";
import { EmailNotice } from "@/components/ui/email-notice";
import { queryKeys } from "@/lib/query-keys";
import {
  clampTradeAmountToCurrency,
  formatCurrency,
  formatDate,
  getTradeAmountMinimum,
  getTradeAmountRequirement,
  supportedTradeCurrencies,
} from "@/lib/utils";
import type { UserProfile } from "@/types";

interface IQAccountResponse {
  _id: string;
  botId: string;
  login: string;
  email: string;
  label: string;
  balance: number;
  tradeAmount: number;
  martingaleEnabled: boolean;
  martingaleSteps: number[] | null;
  mode: string;
  accountType: string;
  currency: string;
  lastConnected: string;
}

const BROKERS = [
  {    id: "iq-option",
    name: "IQ Option",
    logo: "/autobot-assets/iq-option-small.svg",
    available: true,
    description: "Binary options & digital trading",
  },
  {
    id: "pocket-option",
    name: "Pocket Option",
    logo: "/autobot-assets/pocket-option.svg",
    available: false,
    description: "Binary options trading platform",
  },
  {
    id: "expert-option",
    name: "ExpertOption",
    logo: "/autobot-assets/expert-option.svg",
    available: false,
    description: "Online trading platform",
  },
];

const BOT_STEPS = [
  { step: 1, title: "Connect your broker", description: "Enter your IQ Option email and password below." },
  { step: 2, title: "Configure settings", description: "Set your trade amount, account type, and martingale strategy." },
  { step: 3, title: "Bot starts trading", description: "The bot automatically places trades based on signals." },
  { step: 4, title: "Monitor results", description: "Track your trades, balance, and performance in real-time." },
];

export function AccountsManager() {
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => normalizeUserProfile((await api.get("/user/profile")).data) as UserProfile | null,
  });

  // Fetch connected accounts from backend
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: queryKeys.accounts,
    queryFn: async () => {
      const res = await api.get("/user/iq-account");
      return (Array.isArray(res.data) ? res.data : []) as IQAccountResponse[];
    },
  });

  // Connect form state
  const [connectEmail, setConnectEmail] = useState("");
  const [connectPassword, setConnectPassword] = useState("");
  const [connectAccountType, setConnectAccountType] = useState<"PRACTICE" | "REAL">("PRACTICE");
  const [connectTradeCurrency, setConnectTradeCurrency] = useState<string>("USD");
  const [connectTradeAmount, setConnectTradeAmount] = useState(() => getTradeAmountMinimum("USD"));
  const [showPassword, setShowPassword] = useState(false);

  // Edit drafts per account
  const [drafts, setDrafts] = useState<Record<string, { tradeAmount: number; martingaleEnabled: boolean; accountType: string }>>({});

  function getDraft(account: IQAccountResponse) {
    const key = account._id;
    return drafts[key] ?? {
      tradeAmount: account.tradeAmount,
      martingaleEnabled: account.martingaleEnabled,
      accountType: account.accountType,
    };
  }

  function updateDraft(id: string, updates: Partial<{ tradeAmount: number; martingaleEnabled: boolean; accountType: string }>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...getDraftById(id), ...updates },
    }));
  }

  function getDraftById(id: string) {
    const account = accounts.find((a) => a._id === id);
    return drafts[id] ?? {
      tradeAmount: account?.tradeAmount ?? 1,
      martingaleEnabled: account?.martingaleEnabled ?? false,
      accountType: account?.accountType ?? "PRACTICE",
    };
  }

  // POST /user/iq-account — connect new account
  const connectMutation = useMutation({
    mutationFn: async () => {
      await api.post("/user/iq-account", {
        email: connectEmail,
        password: connectPassword,
        accountType: connectAccountType,
        tradeCurrency: connectTradeCurrency,
        tradeAmount: connectTradeAmount,
      });
    },
    onSuccess: () => {
      toast.success("Broker account connected. A confirmation may be sent to your email.");
      setConnectEmail("");
      setConnectPassword("");
      setConnectAccountType("PRACTICE");
      setConnectTradeCurrency("USD");
      setConnectTradeAmount(getTradeAmountMinimum("USD"));
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.botStatus });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to connect account");
    },
  });

  // PUT /user/iq-account — update settings
  const updateMutation = useMutation({
    mutationFn: async ({ email, values }: { email: string; values: { tradeAmount: number; martingaleEnabled: boolean; accountType: string } }) => {
      await api.put("/user/iq-account", {
        email,
        tradeAmount: values.tradeAmount,
        martingaleEnabled: values.martingaleEnabled,
        accountType: values.accountType,
      });
    },
    onSuccess: () => {
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.botStatus });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    },
  });

  // POST /user/iq-account/refresh — refresh balance in real-time
  const refreshMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await api.post("/user/iq-account/refresh", { email });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Account refreshed successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.botStatus });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to refresh account");
    },
  });

  // DELETE /user/iq-account — disconnect account
  const disconnectMutation = useMutation({
    mutationFn: async (email: string) => {
      await api.delete("/user/iq-account", { data: { email } });
    },
    onSuccess: () => {
      toast.success("Account disconnected. An account security notification may be sent to your email.");
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.botStatus });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect");
    },
  });

  const hasAccounts = accounts.length > 0;
  const activePlan = profile?.subscription?.active ? profile.subscription.plan : profile?.plan ?? "NONE";
  const accountLimit = activePlan === "VIP" ? 3 : 1;
  const canAddMoreAccounts = activePlan !== "NONE" && accounts.length < accountLimit;
  const capacityLabel = `${accounts.length}/${accountLimit} connected`;
  const connectAmountMinimum = getTradeAmountMinimum(connectTradeCurrency);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Broker</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Connect and manage your trading broker accounts.</p>
      </div>

      {/* Available Brokers */}
      <div>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">Available Brokers</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {BROKERS.map((broker) => (
            <div
              key={broker.id}
              className={`relative rounded-2xl border p-3 transition-colors ${
                broker.available
                  ? "border-primary/20 bg-primary/[0.04]"
                  : "border-white/[0.06] bg-white/[0.02] opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5">
                  <Image src={broker.logo} alt={broker.name} width={32} height={32} className="h-7 w-7 object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{broker.name}</p>
                    {broker.available ? (
                      <Badge variant="success" className="text-[10px]">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{broker.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How The Bot Works */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-semibold">How The Bot Works</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BOT_STEPS.map((s) => (
            <div key={s.step} className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {s.step}
              </div>
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connected accounts from API */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-white/[0.06] py-12">
          <p className="text-sm text-muted-foreground">Loading accounts...</p>
        </div>
      ) : hasAccounts ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">Connected Accounts</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {activePlan === "VIP"
                  ? `VIP plan supports up to 3 IQ Option accounts. ${capacityLabel}.`
                  : `Your current plan supports 1 IQ Option account. ${capacityLabel}.`}
              </p>
            </div>
            <Badge variant={canAddMoreAccounts ? "warning" : "success"}>{capacityLabel}</Badge>
          </div>
          {accounts.map((account) => {
            const draft = getDraft(account);

            return (
              <div key={account._id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                {/* Account header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5">
                      <Image src="/autobot-assets/iq-option-small.svg" alt="IQ Option" width={32} height={32} className="h-7 w-7 object-contain" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{account.email}</p>
                      <p className="text-[11px] text-muted-foreground">{account.accountType} Account</p>
                    </div>
                  </div>
                  <Badge variant="success">Connected</Badge>
                </div>

                {/* Stats — 2 cols on mobile, 4 on sm+ */}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Balance</p>
                    <p className="mt-1 font-display text-base font-semibold">
                      {formatCurrency(account.balance ?? 0, account.currency)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Trade Amount</p>
                    <p className="mt-1 font-display text-base font-semibold">{formatCurrency(account.tradeAmount, account.currency)}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Mode</p>
                    <p className="mt-1 text-sm font-medium">{account.accountType}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Martingale</p>
                    <p className="mt-1 text-sm font-medium">{account.martingaleEnabled ? "On" : "Off"}</p>
                  </div>
                </div>

                {/* Last connected */}
                {account.lastConnected && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Last connected: {formatDate(account.lastConnected)}
                  </p>
                )}

                {/* Settings controls */}
                <div className="mt-4 border-t border-white/5 pt-4">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">Trading Settings</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`amt-${account._id}`} className="text-xs">Trade Amount</Label>
                      <Input
                        id={`amt-${account._id}`}
                        type="number"
                        min={getTradeAmountMinimum(account.currency)}
                        value={draft.tradeAmount}
                        onChange={(e) => updateDraft(account._id, { tradeAmount: Number(e.target.value) })}
                      />
                      <p className="text-[11px] text-muted-foreground">{getTradeAmountRequirement(account.currency)}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`type-${account._id}`} className="text-xs">Account Type</Label>
                      <select
                        id={`type-${account._id}`}
                        className="flex h-11 w-full rounded-2xl border border-input bg-background/70 px-4 text-sm text-foreground"
                        value={draft.accountType}
                        onChange={(e) => updateDraft(account._id, { accountType: e.target.value })}
                      >
                        <option value="PRACTICE">Practice</option>
                        <option value="REAL">Real</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Martingale Strategy</Label>
                      <div className="flex h-11 items-center justify-between rounded-2xl border border-input bg-background/70 px-4">
                        <span className="text-sm">{draft.martingaleEnabled ? "On" : "Off"}</span>
                        <Switch
                          checked={draft.martingaleEnabled}
                          onCheckedChange={(checked) => updateDraft(account._id, { martingaleEnabled: checked })}
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    className="mt-3 w-full sm:w-auto"
                    size="sm"
                    onClick={() => updateMutation.mutate({ email: account.email, values: draft })}
                    disabled={updateMutation.isPending || draft.tradeAmount < getTradeAmountMinimum(account.currency)}
                  >
                    {updateMutation.isPending ? "Saving..." : "Save settings"}
                  </Button>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refreshMutation.mutate(account.email)}
                      disabled={refreshMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {refreshMutation.isPending ? "Refreshing..." : "Refresh"}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Disconnect ${account.email}?`)) {
                          disconnectMutation.mutate(account.email);
                        }
                      }}
                      disabled={disconnectMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {canAddMoreAccounts ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white p-1.5">
                    <Image src="/autobot-assets/iq-option.svg" alt="IQ Option" width={60} height={18} className="h-3.5 w-auto" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-semibold sm:text-base">Add Another IQ Option Account</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {activePlan === "VIP"
                        ? "Connect another account for your VIP bot allocation."
                        : "Connect your broker account."}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">{capacityLabel}</Badge>
              </div>

              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div className="text-xs text-amber-300">
                  <p className="font-medium">Use an IQ Option login that is not already connected</p>
                  <p className="mt-0.5 text-amber-300/80">
                    VIP users can attach up to 3 separate IQ Option accounts. Standard and Pro remain capped at 1.
                  </p>
                </div>
              </div>

              <EmailNotice
                variant="warning"
                message="Connecting or disconnecting a broker account may trigger account security notifications to your registered email."
                className="mb-4"
              />

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="iq-email-extra" className="text-xs">IQ Option Email</Label>
                  <Input
                    id="iq-email-extra"
                    type="email"
                    placeholder="your@email.com"
                    value={connectEmail}
                    onChange={(e) => setConnectEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="iq-password-extra" className="text-xs">IQ Option Password</Label>
                  <div className="relative">
                    <Input
                      id="iq-password-extra"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={connectPassword}
                      onChange={(e) => setConnectPassword(e.target.value)}
                      className="pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="iq-type-extra" className="text-xs">Account Type</Label>
                  <select
                    id="iq-type-extra"
                    className="flex h-11 w-full rounded-2xl border border-input bg-background/70 px-4 text-sm text-foreground"
                    value={connectAccountType}
                    onChange={(e) => setConnectAccountType(e.target.value as "PRACTICE" | "REAL")}
                  >
                    <option value="PRACTICE">Practice</option>
                    <option value="REAL">Real</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="iq-currency-extra" className="text-xs">Trade Currency</Label>
                  <select
                    id="iq-currency-extra"
                    className="flex h-11 w-full rounded-2xl border border-input bg-background/70 px-4 text-sm text-foreground"
                    value={connectTradeCurrency}
                    onChange={(e) => {
                      const nextCurrency = e.target.value;
                      setConnectTradeCurrency(nextCurrency);
                      setConnectTradeAmount((currentAmount) => clampTradeAmountToCurrency(currentAmount, nextCurrency));
                    }}
                  >
                    {supportedTradeCurrencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="iq-amount-extra" className="text-xs">Trade Amount</Label>
                  <Input
                    id="iq-amount-extra"
                    type="number"
                    min={connectAmountMinimum}
                    value={connectTradeAmount}
                    onChange={(e) => setConnectTradeAmount(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-muted-foreground">{getTradeAmountRequirement(connectTradeCurrency)}</p>
                </div>

                <Button
                  className="w-full sm:w-auto"
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending || !connectEmail || !connectPassword || connectTradeAmount < connectAmountMinimum}
                >
                  {connectMutation.isPending ? "Connecting..." : activePlan === "VIP" ? "Add account" : "Connect account"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-muted-foreground">
              {activePlan === "VIP"
                ? "You have reached the current VIP limit of 3 IQ Option accounts. Disconnect one to add another."
                : "Your current plan allows one IQ Option account at a time."}
            </div>
          )}
        </div>
      ) : (
        /* Connect IQ Option form */
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white p-1.5">
              <Image src="/autobot-assets/iq-option.svg" alt="IQ Option" width={60} height={18} className="h-3.5 w-auto" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold sm:text-base">Connect IQ Option</h3>
              <p className="text-[11px] text-muted-foreground">Enter your IQ Option credentials to get started.</p>
            </div>
          </div>

          {/* Warning */}
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="text-xs text-amber-300">
              <p className="font-medium">Make sure your credentials are correct</p>
              <p className="mt-0.5 text-amber-300/80">
                Use the same email and password you use to login to IQ Option.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="iq-email" className="text-xs">IQ Option Email</Label>
              <Input
                id="iq-email"
                type="email"
                placeholder="your@email.com"
                value={connectEmail}
                onChange={(e) => setConnectEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iq-password" className="text-xs">IQ Option Password</Label>
              <div className="relative">
                <Input
                  id="iq-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your IQ Option password"
                  value={connectPassword}
                  onChange={(e) => setConnectPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iq-account-type" className="text-xs">Account Type</Label>
              <select
                id="iq-account-type"
                className="flex h-11 w-full rounded-2xl border border-input bg-background/70 px-4 text-sm text-foreground"
                value={connectAccountType}
                onChange={(e) => setConnectAccountType(e.target.value as "PRACTICE" | "REAL")}
              >
                <option value="PRACTICE">Practice (Demo)</option>
                <option value="REAL">Real (Live)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iq-trade-currency" className="text-xs">Trade Currency</Label>
              <select
                id="iq-trade-currency"
                className="flex h-11 w-full rounded-2xl border border-input bg-background/70 px-4 text-sm text-foreground"
                value={connectTradeCurrency}
                onChange={(e) => {
                  const nextCurrency = e.target.value;
                  setConnectTradeCurrency(nextCurrency);
                  setConnectTradeAmount((currentAmount) => clampTradeAmountToCurrency(currentAmount, nextCurrency));
                }}
              >
                {supportedTradeCurrencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iq-trade-amount" className="text-xs">Trade Amount</Label>
              <Input
                id="iq-trade-amount"
                type="number"
                min={connectAmountMinimum}
                value={connectTradeAmount}
                onChange={(e) => setConnectTradeAmount(Number(e.target.value))}
              />
              <p className="text-[11px] text-muted-foreground">{getTradeAmountRequirement(connectTradeCurrency)}</p>
            </div>
            <Button
              className="w-full"
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending || !connectEmail || !connectPassword || connectTradeAmount < connectAmountMinimum}
            >
              {connectMutation.isPending ? "Connecting..." : "Connect Account"}
            </Button>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/[0.02] p-3">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
            <p className="text-[11px] text-muted-foreground">
              Your password is sent securely. We never store plain text passwords.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}