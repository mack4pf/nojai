"use client";

/**
 * The admin's Olymp Partner accounts, and Buy/Sell on each of them.
 *
 * As many as they want: a customer has one Olymp account, an admin runs
 * several — one per balance, per strategy, per signal source. Each card
 * trades independently, and a trade placed on a real account is the one
 * followers copy.
 *
 * This is the current way an account is linked. NOJAI creates or connects it
 * through the Partner API, so there is no token to paste and no session that
 * expires every two days.
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Loader2, Plus, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface PartnerBalance {
  id: number;
  type: "real" | "demo";
  currency: string;
  balance: number;
}

interface AdminOlympAccount {
  olympUserId: number;
  email?: string;
  label?: string;
  linkMethod: "created" | "claimed";
  accountGroup: "real" | "demo";
  baseAmount: number;
  createdAt: string;
  balances: PartnerBalance[];
  /** Set when Olymp would not answer for this login. */
  unreachable?: string;
}

interface OlympPairOption {
  id: string;
  title: string;
  group: string;
  payoutPercent?: number;
  durationChoices: number[];
  isOpen: boolean;
}

interface AdminTradeResult {
  tradeId: string;
  asset: string;
  direction: "call" | "put";
  amount: number;
  durationSecs: number;
  accountGroup: string;
  mirrored: boolean;
  followers: { attempted: number; placed: number; failed: number; reason?: string };
  skipped?: "mirror-off" | "account-not-real" | "mirror-failed";
  error?: string;
}

interface TradeDraft {
  ticker: string;
  amount: number;
  durationSecs: number;
  group: "real" | "demo";
}

const ACCOUNTS_KEY = ["admin-olymp-partner-accounts"];
const FALLBACK_DURATIONS = [60, 120, 180, 300, 600, 900, 1800, 3600];

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return secs % 60 === 0 ? `${secs / 60}m` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return secs % 3600 === 0 ? `${secs / 3600}h` : `${Math.floor(secs / 3600)}h ${Math.round((secs % 3600) / 60)}m`;
}

function groupLabel(group: string): string {
  return group.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AdminOlympPartnerTrader() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<"create" | "connect">("create");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("NG");
  const [label, setLabel] = useState("");
  const [connectId, setConnectId] = useState("");
  const [drafts, setDrafts] = useState<Record<number, TradeDraft>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [toRemove, setToRemove] = useState<AdminOlympAccount | null>(null);

  const { data, isLoading } = useQuery<{ accounts: AdminOlympAccount[] }>({
    queryKey: ACCOUNTS_KEY,
    queryFn: async () => (await api.get<{ accounts: AdminOlympAccount[] }>("/admin/olymp-partner-accounts")).data,
  });
  const accounts = data?.accounts ?? [];

  const { data: pairData } = useQuery<{ pairs: OlympPairOption[] }>({
    queryKey: ["admin-olymp-pairs"],
    queryFn: async () => (await api.get<{ pairs: OlympPairOption[] }>("/admin/olymp-accounts/pairs")).data,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
  const pairs = pairData?.pairs ?? [];
  const catalogueUnavailable = pairs.length === 0;
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

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    queryClient.invalidateQueries({ queryKey: ["admin-olymp-live-trades"] });
  };

  const resetAddForm = () => {
    setEmail("");
    // Not left in component state once it has been sent: it is a broker
    // credential and we deliberately never hold one.
    setPassword("");
    setLabel("");
    setConnectId("");
  };

  const createMutation = useMutation({
    mutationFn: async () =>
      (await api.post("/admin/olymp-partner-accounts", {
        email: email.trim(),
        password,
        country: country.trim().toUpperCase(),
        ...(label.trim() ? { label: label.trim() } : {}),
      })).data,
    onSuccess: () => {
      toast.success("Olymp account created", {
        description: "Sign in to Olymp with that email and password whenever you need the terminal.",
      });
      resetAddForm();
      setShowAdd(false);
      refresh();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? err?.message ?? "Could not create the account"),
  });

  const connectMutation = useMutation({
    mutationFn: async () =>
      (await api.post("/admin/olymp-partner-accounts/claim", {
        olympUserId: Number(connectId),
        ...(label.trim() ? { label: label.trim() } : {}),
      })).data,
    onSuccess: () => {
      toast.success("Olymp account connected");
      resetAddForm();
      setShowAdd(false);
      refresh();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? err?.message ?? "Could not connect that account"),
  });

  const removeMutation = useMutation({
    mutationFn: async (olympUserId: number) =>
      (await api.delete(`/admin/olymp-partner-accounts/${olympUserId}`)).data,
    onSuccess: () => {
      toast.success("Removed", { description: "The Olymp account still exists — it just no longer trades here." });
      setToRemove(null);
      refresh();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? err?.message ?? "Could not remove that account"),
  });

  const tradeMutation = useMutation({
    mutationFn: async ({ olympUserId, direction, draft }: { olympUserId: number; direction: "buy" | "sell"; draft: TradeDraft }) => {
      const res = await api.post<AdminTradeResult>("/admin/olymp-accounts/partner-trade", {
        olympUserId,
        direction,
        ticker: draft.ticker.trim().toUpperCase(),
        amount: draft.amount,
        durationSecs: draft.durationSecs,
        group: draft.group,
      });
      return res.data;
    },
    onSuccess: (result) => {
      const headline = `${result.direction === "call" ? "Buy" : "Sell"} ${result.asset} placed`;
      if (result.mirrored) {
        const { placed, attempted, failed } = result.followers;
        toast.success(headline, {
          description:
            attempted > 0
              ? `Copied to ${placed} of ${attempted} follower${attempted === 1 ? "" : "s"}${failed > 0 ? ` — ${failed} failed` : ""}.`
              : result.followers.reason === "pair-not-tradeable"
                ? `Your deal is open, but Olymp will not copy ${result.asset} right now.`
                : "No follower has opted in yet, so this traded your account only.",
        });
      } else if (result.skipped === "mirror-off") {
        toast.success(headline, { description: "This account only — mirroring is switched off." });
      } else if (result.skipped === "account-not-real") {
        toast.success(headline, { description: "This account only — followers are never copied from a practice account." });
      } else {
        toast.warning(headline, { description: result.error ?? "Your deal is open, but copying to followers failed." });
      }
      refresh();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? err?.message ?? "Failed to place the trade"),
    onSettled: () => setPending(null),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Your Olymp accounts{accounts.length > 0 ? ` (${accounts.length})` : ""}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Add as many as you need. A trade on a real account is the one followers copy.
          </p>
        </div>
        <Button variant={showAdd ? "outline" : "default"} onClick={() => setShowAdd((open) => !open)}>
          {showAdd ? <X className="mr-1.5 h-3.5 w-3.5" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
          {showAdd ? "Cancel" : "Add account"}
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex gap-2">
            {(["create", "connect"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setAddMode(mode)}
                className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                  addMode === mode
                    ? "border-emerald-400 bg-emerald-500/15 text-emerald-300"
                    : "border-white/[0.08] text-muted-foreground hover:border-white/20"
                }`}
              >
                {mode === "create" ? "Create a new one" : "Connect one I have"}
              </button>
            ))}
          </div>

          {addMode === "create" ? (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Email</Label>
                  <Input className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="trader@example.com" />
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Olymp password</Label>
                  <Input
                    className="mt-1"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Country</Label>
                  <Input className="mt-1" value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={2} />
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Name it (optional)</Label>
                  <Input className="mt-1" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Scalper" />
                </div>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                The password is yours and we never store it — it is what lets you sign in to Olymp
                directly rather than only through here. Olymp can only create accounts, never adopt
                one that already exists on an address: if yours is taken, use another or connect the
                existing account instead.
              </p>
              <Button
                className="mt-3"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !email.trim() || password.length < 8}
              >
                {createMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
                Create account
              </Button>
            </>
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Olymp account id</Label>
                  <Input className="mt-1" value={connectId} onChange={(e) => setConnectId(e.target.value)} placeholder="1234567" />
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Name it (optional)</Label>
                  <Input className="mt-1" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Main" />
                </div>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Only works for an account opened under our partner link — Olymp answers for no other,
                and that refusal is what proves it.
              </p>
              <Button
                className="mt-3"
                variant="outline"
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending || !connectId.trim()}
              >
                {connectMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Link2 className="mr-1.5 h-3.5 w-3.5" />}
                Connect
              </Button>
            </>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-28 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03]">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-sm font-medium text-white">No Olymp account yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
            Add one to trade from here. Buy and Sell place on the account you choose, and when
            mirroring is on they copy to the followers who opted in.
          </p>
        </div>
      ) : (
        accounts.map((account) => {
          const draft: TradeDraft = drafts[account.olympUserId] ?? {
            ticker: "",
            amount: account.baseAmount,
            durationSecs: 60,
            group: account.accountGroup,
          };
          const setDraft = (next: Partial<TradeDraft>) =>
            setDrafts((prev) => ({ ...prev, [account.olympUserId]: { ...draft, ...next } }));

          const selectedPair = pairsById.get(draft.ticker.trim().toUpperCase());
          const durationChoices = selectedPair?.durationChoices ?? FALLBACK_DURATIONS;
          const effectiveDuration = durationChoices.includes(draft.durationSecs)
            ? draft.durationSecs
            : durationChoices.reduce(
                (best, secs) => (Math.abs(secs - draft.durationSecs) < Math.abs(best - draft.durationSecs) ? secs : best),
                durationChoices[0] ?? 60,
              );
          const activeBalance = account.balances.find((item) => item.type === draft.group);
          const canTrade = Boolean(draft.ticker.trim()) && draft.amount >= 1 && !account.unreachable;

          return (
            <div key={account.olympUserId} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">
                      {account.label || account.email || `Olymp ${account.olympUserId}`}
                    </p>
                    <Badge variant="success" className="text-[10px]">Partner</Badge>
                    {account.linkMethod === "claimed" ? (
                      <Badge variant="outline" className="text-[10px]">Connected</Badge>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span>Olymp id {account.olympUserId}</span>
                    {account.email ? <span>· {account.email}</span> : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {account.balances.map((balance) => (
                    <button
                      key={balance.id}
                      onClick={() => setDraft({ group: balance.type })}
                      className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                        draft.group === balance.type
                          ? "border-emerald-400 bg-emerald-500/10"
                          : "border-white/[0.08] hover:border-white/20"
                      }`}
                    >
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        {balance.type === "real" ? "Real" : "Demo"}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold">{formatCurrency(balance.balance, balance.currency)}</p>
                    </button>
                  ))}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setToRemove(account)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {account.unreachable && (
                <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/[0.08] p-3">
                  <p className="text-xs font-semibold text-destructive">Olymp would not answer for this account</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    Balances and trading are unavailable until it does. {account.unreachable}
                  </p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-white/[0.06] pt-4">
                <div className="min-w-[12rem] flex-1">
                  <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Instrument{pairs.length > 0 ? ` (${pairs.length})` : ""}
                  </Label>
                  {catalogueUnavailable ? (
                    <Input
                      className="mt-1"
                      placeholder="EURUSD"
                      value={draft.ticker}
                      onChange={(e) => setDraft({ ticker: e.target.value.toUpperCase() })}
                    />
                  ) : (
                    <select
                      className="mt-1 h-10 w-full rounded-md border border-white/[0.08] bg-black/20 px-3 text-sm text-foreground"
                      value={draft.ticker}
                      onChange={(e) => {
                        const next = pairsById.get(e.target.value);
                        setDraft({
                          ticker: e.target.value,
                          durationSecs:
                            next && !next.durationChoices.includes(draft.durationSecs)
                              ? (next.durationChoices.find((secs) => secs >= draft.durationSecs) ?? next.durationChoices[0] ?? 60)
                              : draft.durationSecs,
                        });
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
                  <Input className="mt-1" type="number" min={1} value={draft.amount} onChange={(e) => setDraft({ amount: Number(e.target.value) })} />
                </div>
                <div className="w-28">
                  <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Expiry</Label>
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-white/[0.08] bg-black/20 px-3 text-sm text-foreground"
                    value={effectiveDuration}
                    onChange={(e) => setDraft({ durationSecs: Number(e.target.value) })}
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
                    setPending(`${account.olympUserId}:buy`);
                    tradeMutation.mutate({ olympUserId: account.olympUserId, direction: "buy", draft: { ...draft, durationSecs: effectiveDuration } });
                  }}
                >
                  {pending === `${account.olympUserId}:buy`
                    ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    : <TrendingUp className="mr-1.5 h-3.5 w-3.5" />}
                  Buy
                </Button>
                <Button
                  className="bg-red-600 text-white hover:bg-red-500"
                  disabled={!canTrade || tradeMutation.isPending}
                  onClick={() => {
                    setPending(`${account.olympUserId}:sell`);
                    tradeMutation.mutate({ olympUserId: account.olympUserId, direction: "sell", draft: { ...draft, durationSecs: effectiveDuration } });
                  }}
                >
                  {pending === `${account.olympUserId}:sell`
                    ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    : <TrendingDown className="mr-1.5 h-3.5 w-3.5" />}
                  Sell
                </Button>
              </div>

              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                {account.unreachable
                  ? "Trading is unavailable while Olymp will not answer for this account."
                  : !activeBalance
                    ? `Olymp reports no ${draft.group} balance on this login.`
                    : !draft.ticker.trim()
                      ? catalogueUnavailable
                        ? "Instrument list unavailable — type the name as Olymp spells it."
                        : "Choose an instrument to trade."
                      : selectedPair && !selectedPair.isOpen
                        ? `${selectedPair.title} is outside its trading hours — Olymp will probably reject this.`
                        : draft.group === "real"
                          ? `Places ${formatCurrency(draft.amount, activeBalance.currency)} for ${formatDuration(effectiveDuration)} on this real account and copies it to followers who opted in.`
                          : `Practice balance — places ${formatCurrency(draft.amount, activeBalance.currency)} for ${formatDuration(effectiveDuration)} here only. Followers are never copied from a practice account.`}
              </p>
            </div>
          );
        })
      )}

      <ConfirmDialog
        open={Boolean(toRemove)}
        onOpenChange={(open) => { if (!open) setToRemove(null); }}
        title="Remove this Olymp account?"
        description={`${toRemove?.label || toRemove?.email || `Olymp ${toRemove?.olympUserId}`} will stop trading here. The account itself stays open at Olymp and you can still sign in to it — only the link to NOJAI is removed.`}
        confirmLabel="Remove"
        destructive
        loading={removeMutation.isPending}
        onConfirm={() => { if (toRemove) removeMutation.mutate(toRemove.olympUserId); }}
      />
    </div>
  );
}
