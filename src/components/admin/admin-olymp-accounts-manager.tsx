"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Info, Loader2, Plus, RefreshCw, Trash2, TrendingDown, TrendingUp, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

const OLYMP_LOGO = "/autobot-assets/olymptrade.jpeg";
const QUERY_KEY = ["admin-olymp-accounts"];

type AuthMethod = "token" | "password";

interface AdminOlympAccount {
  accountId: number;
  email?: string;
  name?: string;
  accountGroup: "real" | "demo";
  baseAmount: number;
  balance: number;
  currency: string;
  status: "connected" | "disconnected";
  isConnected: boolean;
  lastConnected?: string | null;
  /**
   * Olymp ended the session and we cannot renew it. Reported separately from
   * isConnected because the two need different actions: offline may recover on
   * its own, this needs a fresh token pasted in. Reconnecting with the dead one
   * just fails.
   */
  needsReauth?: boolean;
  needsReauthReason?: string;
}

/** What the backend reports back from one Buy or Sell press. */
interface AdminTradeResult {
  tradeId: string;
  asset: string;
  direction: "call" | "put";
  amount: number;
  durationSecs: number;
  accountGroup: string;
  mirrored: boolean;
  followers: {
    attempted: number;
    placed: number;
    failed: number;
    /** Why nothing was attempted. Without it, zero followers reads the same
        whether nobody opted in or Olymp will not trade the instrument. */
    reason?: "no-eligible-users" | "pair-not-tradeable";
  };
  skipped?: "mirror-off" | "account-not-real" | "mirror-failed";
  error?: string;
}

/** What the admin is about to place, per account. */
interface TradeDraft {
  ticker: string;
  amount: number;
  durationSecs: number;
}

/** One instrument the admin can trade, as the backend reports it. */
interface OlympPairOption {
  id: string;
  title: string;
  group: string;
  payoutPercent?: number;
  minDurationSecs: number;
  maxDurationSecs: number;
  /** Expiries this pair accepts. Computed server-side so the two cannot drift. */
  durationChoices: number[];
  isOpen: boolean;
  opensAt?: string;
  closesAt?: string;
}

interface OlympPairsResponse {
  pairs: OlympPairOption[];
  unavailable?: boolean;
  message?: string;
}

/** Offered when the catalogue could not be loaded and the admin types a name. */
const FALLBACK_DURATIONS = [60, 120, 180, 300, 600, 900, 1800, 3600];

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return secs % 60 === 0 ? `${secs / 60}m` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return secs % 3600 === 0 ? `${secs / 3600}h` : `${Math.floor(secs / 3600)}h ${Math.round((secs % 3600) / 60)}m`;
}

/** Title-cases whatever Olymp calls the category, for the optgroup label. */
function groupLabel(group: string): string {
  return group.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface AdminOlympAccountsResponse {
  accounts: AdminOlympAccount[];
  connectedCount: number;
  reauthRequiredCount?: number;
}

export function AdminOlympAccountsManager() {
  const queryClient = useQueryClient();
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>("token");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [needsVerificationCode, setNeedsVerificationCode] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [baseAmount, setBaseAmount] = useState(1);
  const [accountGroup, setAccountGroup] = useState<"real" | "demo">("real");
  const [draftAmounts, setDraftAmounts] = useState<Record<number, number>>({});
  const [accountToDisconnect, setAccountToDisconnect] = useState<AdminOlympAccount | null>(null);
  const [tradeDrafts, setTradeDrafts] = useState<Record<number, TradeDraft>>({});
  /** Which button is in flight, so only that one spins. */
  const [tradePending, setTradePending] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<AdminOlympAccountsResponse>({
    queryKey: QUERY_KEY,
    queryFn: async () => (await api.get("/admin/olymp-accounts")).data,
    refetchInterval: 30_000,
  });

  /**
   * The instrument catalogue. Cached hard on purpose: it is the same list for
   * every account on the page and it changes on the hour at most, so a trader
   * clicking between accounts should never wait for it.
   */
  const { data: pairData } = useQuery<OlympPairsResponse>({
    queryKey: ["admin-olymp-pairs"],
    queryFn: async () => (await api.get<OlympPairsResponse>("/admin/olymp-accounts/pairs")).data,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
  const pairs = pairData?.pairs ?? [];
  const pairsById = useMemo(() => new Map(pairs.map((pair) => [pair.id, pair])), [pairs]);
  const pairsByGroup = useMemo(() => {
    const groups = new Map<string, OlympPairOption[]>();
    for (const pair of pairs) {
      const list = groups.get(pair.group);
      if (list) list.push(pair);
      else groups.set(pair.group, [pair]);
    }
    return [...groups.entries()];
  }, [pairs]);
  const catalogueUnavailable = Boolean(pairData?.unavailable) || pairs.length === 0;

  const accounts = data?.accounts ?? [];
  const connectedCount = data?.connectedCount ?? accounts.filter((account) => account.isConnected).length;

  const connectMutation = useMutation({
    mutationFn: async () => {
      const payload =
        authMethod === "token"
          ? { authMethod, token, baseAmount, accountGroup }
          : { authMethod, email, password, verificationCode: verificationCode.trim() || undefined, baseAmount, accountGroup };
      return (await api.post("/admin/olymp-accounts/connect", payload)).data;
    },
    onSuccess: (res) => {
      if (res?.verificationRequired) {
        const canEnterCode = ["email_code", "2fa", "device_verification"].includes(String(res.verificationType ?? ""));
        const baseMessage = canEnterCode
          ? res.message ?? "Olymp Trade requested a verification code. Check Olymp Trade for the code, then enter it here."
          : res.message ?? "Olymp Trade rejected this login without a readable message.";
        const detail = [res.verificationType ? `Type: ${res.verificationType}` : null, res.providerStatus ? `Status: ${res.providerStatus}` : null]
          .filter(Boolean)
          .join(" · ");
        const message = detail ? `${baseMessage} (${detail})` : baseMessage;
        setNeedsVerificationCode(canEnterCode);
        setVerificationMessage(message);
        toast.warning(message);
        return;
      }
      toast.success(`${res?.account?.name ?? "Olymp Trade account"} connected`);
      setToken("");
      setEmail("");
      setPassword("");
      setVerificationCode("");
      setVerificationMessage("");
      setNeedsVerificationCode(false);
      setBaseAmount(1);
      setAccountGroup("real");
      setShowConnectForm(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-connected-accounts"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to connect Olymp Trade account"),
  });

  const reconnectMutation = useMutation({
    mutationFn: (accountId: number) => api.post(`/admin/olymp-accounts/${accountId}/reconnect`),
    onSuccess: () => {
      toast.success("Olymp Trade account reconnected");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to reconnect Olymp Trade account"),
  });

  const refreshMutation = useMutation({
    mutationFn: (accountId: number) => api.post(`/admin/olymp-accounts/${accountId}/refresh-balance`),
    onSuccess: () => {
      toast.success("Balance refreshed");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to refresh balance"),
  });

  const baseAmountMutation = useMutation({
    mutationFn: ({ accountId, nextBaseAmount }: { accountId: number; nextBaseAmount: number }) =>
      api.patch(`/admin/olymp-accounts/${accountId}/base-amount`, { baseAmount: nextBaseAmount }),
    onSuccess: () => {
      toast.success("Base amount updated");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to update base amount"),
  });

  /**
   * Buy or sell on the admin's own account, which also copies the trade to
   * the followers who opted in.
   *
   * The toast says what actually reached them rather than just "done": a
   * trade that filled on this account but copied to nobody is the normal
   * outcome while mirroring is switched off, and silently reading as success
   * is how that goes unnoticed.
   */
  const tradeMutation = useMutation({
    mutationFn: async ({ accountId, direction, draft }: { accountId: number; direction: "buy" | "sell"; draft: TradeDraft }) => {
      const res = await api.post<AdminTradeResult>(`/admin/olymp-accounts/${accountId}/trade`, {
        direction,
        ticker: draft.ticker.trim().toUpperCase(),
        amount: draft.amount,
        durationSecs: draft.durationSecs,
      });
      return res.data;
    },
    onSuccess: (result) => {
      const side = result.direction === "call" ? "Buy" : "Sell";
      const headline = `${side} ${result.asset} placed`;
      if (result.mirrored) {
        const { placed, attempted, failed } = result.followers;
        toast.success(headline, {
          description: attempted > 0
            ? `Copied to ${placed} of ${attempted} follower${attempted === 1 ? "" : "s"}${failed > 0 ? ` — ${failed} failed` : ""}.`
            : result.followers.reason === "pair-not-tradeable"
              ? `Your trade is live, but Olymp does not list ${result.asset} for copy trading right now, so no follower was copied.`
              : "No follower has opted in yet, so this traded your account only.",
        });
      } else if (result.skipped === "mirror-off") {
        toast.success(headline, { description: "Your account only — mirroring is switched off." });
      } else {
        toast.warning(headline, { description: result.error ?? "Your trade is live, but copying to followers failed." });
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin-olymp-live-trades"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? err?.message ?? "Failed to place the trade"),
    onSettled: () => setTradePending(null),
  });

  const disconnectMutation = useMutation({
    mutationFn: (accountId: number) => api.delete(`/admin/olymp-accounts/${accountId}`),
    onSuccess: () => {
      toast.success("Olymp Trade account disconnected");
      setAccountToDisconnect(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-connected-accounts"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to disconnect account"),
  });

  const connectDisabled =
    connectMutation.isPending ||
    baseAmount < 1 ||
    (authMethod === "token" ? token.trim().length < 10 : !email.trim() || !password.trim());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-400">
        Failed to load Olymp Trade accounts.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
          <Image src={OLYMP_LOGO} alt="Olymp Trade" width={32} height={32} className="h-8 w-8 object-contain" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Olymp Trade Admin Accounts</h2>
          <p className="text-xs text-muted-foreground">Connect Olymp Trade accounts for admin testing, monitoring, and Olymp signal execution.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Connected Olymp Accounts</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{connectedCount} live / {accounts.length} saved</p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowConnectForm((value) => !value)}>
            <Plus className="h-3.5 w-3.5" /> {showConnectForm ? "Cancel" : "Connect account"}
          </Button>
        </div>
      </div>

      {showConnectForm && (
        <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-white">Connect Olymp Trade Account</h3>

          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1">
            {(["token", "password"] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setAuthMethod(method)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${authMethod === method ? "bg-emerald-500 text-white" : "text-muted-foreground hover:text-foreground"}`}
              >
                {method === "token" ? "Use token" : "Email/password"}
              </button>
            ))}
          </div>

          {authMethod === "password" && (
            <div className="flex gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] p-3 text-xs text-amber-200">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>This will try a normal Olymp Trade email and password login first.</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {authMethod === "token" ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Access Token</Label>
                <div className="relative">
                  <Input
                    type={showSecret ? "text" : "password"}
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value);
                      setVerificationMessage("");
                      setNeedsVerificationCode(false);
                    }}
                    placeholder="Paste Olymp access token"
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowSecret((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setVerificationMessage("");
                      setNeedsVerificationCode(false);
                      setVerificationCode("");
                    }}
                    placeholder="admin@olymptrade.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input
                      type={showSecret ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setVerificationMessage("");
                        setNeedsVerificationCode(false);
                        setVerificationCode("");
                      }}
                      placeholder="Olymp password"
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowSecret((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {needsVerificationCode && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Verification Code</Label>
                    <Input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="Enter the code from Olymp Trade" />
                    {verificationMessage && <p className="text-xs text-amber-200">{verificationMessage}</p>}
                  </div>
                )}
              </>
            )}

            <div className="space-y-1.5">
              <Label>Base Amount</Label>
              <Input type="number" min={1} value={baseAmount} onChange={(e) => setBaseAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Account Group</Label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {(["real", "demo"] as const).map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setAccountGroup(group)}
                    className={`rounded-lg border py-2 text-xs font-medium transition-colors ${accountGroup === group ? "border-emerald-400 bg-emerald-500/15 text-emerald-300" : "border-white/[0.08] text-muted-foreground hover:border-white/20"}`}
                  >
                    {group === "real" ? "Real" : "Demo"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button className="w-full" onClick={() => connectMutation.mutate()} disabled={connectDisabled}>
            {connectMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</> : "Connect Olymp Trade"}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {accounts.length === 0 && !showConnectForm ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
            <p className="text-sm text-muted-foreground">No Olymp Trade accounts connected yet.</p>
            <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => setShowConnectForm(true)}>
              <Plus className="h-3.5 w-3.5" /> Connect account
            </Button>
          </div>
        ) : (
          accounts.map((account) => {
            const draftBaseAmount = draftAmounts[account.accountId] ?? account.baseAmount;
            const draft: TradeDraft = tradeDrafts[account.accountId] ?? { ticker: "", amount: account.baseAmount, durationSecs: 60 };
            const selectedPair = pairsById.get(draft.ticker.trim().toUpperCase());
            const durationChoices = selectedPair?.durationChoices ?? FALLBACK_DURATIONS;
            // A pair's limits are not the same as the last pair's, so an
            // expiry carried over from a previous selection may no longer be
            // valid. Show the nearest one it does accept.
            const effectiveDuration = durationChoices.includes(draft.durationSecs)
              ? draft.durationSecs
              : durationChoices.reduce((best, secs) => (Math.abs(secs - draft.durationSecs) < Math.abs(best - draft.durationSecs) ? secs : best), durationChoices[0] ?? 60);
            const canTrade = account.isConnected && !account.needsReauth && draft.ticker.trim().length > 0 && draft.amount >= 1;
            return (
              <div key={account.accountId} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
                      <Image src={OLYMP_LOGO} alt="Olymp" width={26} height={26} className="h-6 w-6 object-contain" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{account.name || account.email || `Olymp #${account.accountId}`}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant={account.accountGroup === "real" ? "success" : "outline"} className="text-[10px]">{account.accountGroup === "real" ? "Real" : "Demo"}</Badge>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          {account.isConnected ? <Wifi className="h-3 w-3 text-emerald-400" /> : <WifiOff className="h-3 w-3" />}
                          {account.needsReauth ? "Session expired" : account.isConnected ? "Live" : "Offline"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">ID {account.accountId}</span>
                      </div>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setAccountToDisconnect(account)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {account.needsReauth && (
                  <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/[0.08] p-3">
                    <p className="text-xs font-semibold text-destructive">This account needs a new token</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Olymp ended the session — they expire roughly every 48 hours and cannot be renewed
                      from here, so <span className="font-semibold">Reconnect will not fix this</span>.
                      Paste a fresh token with + Connect above. Until then this account places no trades,
                      and nothing from it is mirrored to followers.
                      {account.needsReauthReason ? ` (${account.needsReauthReason})` : ""}
                    </p>
                  </div>
                )}

                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-white/[0.05] bg-black/10 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Balance</p>
                    <p className="mt-1 text-sm font-semibold">{formatCurrency(account.balance ?? 0, account.currency ?? "USD")}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-black/10 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Base</p>
                    <p className="mt-1 text-sm font-semibold">{formatCurrency(account.baseAmount, account.currency ?? "USD")}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-black/10 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Status</p>
                    <p className={account.needsReauth ? "mt-1 text-sm font-semibold text-destructive" : account.isConnected ? "mt-1 text-sm font-semibold text-emerald-300" : "mt-1 text-sm font-semibold text-muted-foreground"}>{account.needsReauth ? "Expired" : account.isConnected ? "Live" : "Offline"}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-black/10 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Last</p>
                    <p className="mt-1 text-xs font-semibold">{account.lastConnected ? formatDate(account.lastConnected) : "-"}</p>
                  </div>
                </div>

                {/* Trade from here. Placing it on this account is also what
                    sends it to the followers, so the two cannot drift apart
                    the way a separate "broadcast" button would. */}
                <div className="mt-4 border-t border-white/[0.06] pt-4">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[12rem] flex-1">
                      <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        Instrument{pairs.length > 0 ? ` (${pairs.length})` : ""}
                      </Label>
                      {catalogueUnavailable ? (
                        <Input
                          className="mt-1"
                          placeholder="EURUSD"
                          value={draft.ticker}
                          onChange={(e) => setTradeDrafts((prev) => ({ ...prev, [account.accountId]: { ...draft, ticker: e.target.value.toUpperCase() } }))}
                        />
                      ) : (
                        <select
                          className="mt-1 h-10 w-full rounded-md border border-white/[0.08] bg-black/20 px-3 text-sm text-foreground"
                          value={draft.ticker}
                          onChange={(e) => {
                            const next = pairsById.get(e.target.value);
                            setTradeDrafts((prev) => ({
                              ...prev,
                              [account.accountId]: {
                                ...draft,
                                ticker: e.target.value,
                                // Snap the expiry into what the new pair takes.
                                durationSecs: next && !next.durationChoices.includes(draft.durationSecs)
                                  ? (next.durationChoices.find((secs) => secs >= draft.durationSecs) ?? next.durationChoices[0] ?? 60)
                                  : draft.durationSecs,
                              },
                            }));
                          }}
                        >
                          <option value="">Choose an instrument…</option>
                          {pairsByGroup.map(([group, groupPairs]) => (
                            <optgroup key={group} label={groupLabel(group)}>
                              {groupPairs.map((pair) => (
                                <option key={pair.id} value={pair.id}>
                                  {pair.title}
                                  {pair.payoutPercent ? ` · ${Math.round(pair.payoutPercent)}%` : ""}
                                  {pair.isOpen ? "" : " · closed now"}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="w-24">
                      <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Amount</Label>
                      <Input
                        className="mt-1"
                        type="number"
                        min={1}
                        value={draft.amount}
                        onChange={(e) => setTradeDrafts((prev) => ({ ...prev, [account.accountId]: { ...draft, amount: Number(e.target.value) } }))}
                      />
                    </div>
                    <div className="w-28">
                      <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Expiry</Label>
                      <select
                        className="mt-1 h-10 w-full rounded-md border border-white/[0.08] bg-black/20 px-3 text-sm text-foreground"
                        value={effectiveDuration}
                        onChange={(e) => setTradeDrafts((prev) => ({ ...prev, [account.accountId]: { ...draft, durationSecs: Number(e.target.value) } }))}
                      >
                        {durationChoices.map((secs) => (
                          <option key={secs} value={secs}>{formatDuration(secs)}</option>
                        ))}
                      </select>
                    </div>
                    <Button
                      className="bg-emerald-600 text-white hover:bg-emerald-500"
                      disabled={!canTrade || tradeMutation.isPending}
                      onClick={() => {
                        setTradePending(`${account.accountId}:buy`);
                        tradeMutation.mutate({ accountId: account.accountId, direction: "buy", draft: { ...draft, durationSecs: effectiveDuration } });
                      }}
                    >
                      {tradePending === `${account.accountId}:buy`
                        ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        : <TrendingUp className="mr-1.5 h-3.5 w-3.5" />}
                      Buy
                    </Button>
                    <Button
                      className="bg-red-600 text-white hover:bg-red-500"
                      disabled={!canTrade || tradeMutation.isPending}
                      onClick={() => {
                        setTradePending(`${account.accountId}:sell`);
                        tradeMutation.mutate({ accountId: account.accountId, direction: "sell", draft: { ...draft, durationSecs: effectiveDuration } });
                      }}
                    >
                      {tradePending === `${account.accountId}:sell`
                        ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        : <TrendingDown className="mr-1.5 h-3.5 w-3.5" />}
                      Sell
                    </Button>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {!account.isConnected
                      ? "Connect this account before trading from here."
                      : !draft.ticker.trim()
                        ? catalogueUnavailable
                          ? "Instrument list unavailable — type the name as Olymp spells it."
                          : "Choose an instrument to trade."
                        : selectedPair && !selectedPair.isOpen
                          ? `${selectedPair.title} is outside its trading hours — Olymp will probably reject this.`
                          : account.accountGroup === "real"
                            ? `Places ${formatCurrency(draft.amount, account.currency ?? "USD")} for ${formatDuration(effectiveDuration)} on this account and copies it to followers who opted in.`
                            : `Practice account — places ${formatCurrency(draft.amount, account.currency ?? "USD")} for ${formatDuration(effectiveDuration)} here, and still copies to followers. Each follower trades their own balance, so a follower set to real stakes real money.`}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-[1fr_auto_auto_auto]">
                  <Input type="number" min={1} value={draftBaseAmount} onChange={(e) => setDraftAmounts((prev) => ({ ...prev, [account.accountId]: Number(e.target.value) }))} />
                  <Button variant="outline" onClick={() => baseAmountMutation.mutate({ accountId: account.accountId, nextBaseAmount: draftBaseAmount })} disabled={baseAmountMutation.isPending || draftBaseAmount < 1}>Save amount</Button>
                  <Button variant="outline" onClick={() => refreshMutation.mutate(account.accountId)} disabled={refreshMutation.isPending}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh</Button>
                  {!account.isConnected && !account.needsReauth && (
                    <Button variant="outline" onClick={() => reconnectMutation.mutate(account.accountId)} disabled={reconnectMutation.isPending}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reconnect</Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmDialog
        open={Boolean(accountToDisconnect)}
        onOpenChange={(open) => { if (!open) setAccountToDisconnect(null); }}
        title="Disconnect Olymp Trade account?"
        description={`Disconnect ${accountToDisconnect?.name || accountToDisconnect?.email || "this account"} from admin Olymp accounts.`}
        confirmLabel="Disconnect"
        destructive
        loading={disconnectMutation.isPending}
        onConfirm={() => {
          if (accountToDisconnect) disconnectMutation.mutate(accountToDisconnect.accountId);
        }}
      />
    </div>
  );
}
