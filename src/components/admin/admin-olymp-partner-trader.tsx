"use client";

/**
 * The admin's own Olymp Partner account, and Buy/Sell on it.
 *
 * This is the current way an Olymp account is linked: NOJAI creates or claims
 * it through the Partner API, so there is no token to paste and no session to
 * expire every 48 hours. The token-based list below this panel is the older
 * route, kept for accounts already connected that way.
 *
 * A trade placed here goes onto this account and, when mirroring is on, onto
 * the accounts of followers who opted in.
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Loader2, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface PartnerAccount {
  id: number;
  type: "real" | "demo";
  currency: string;
  balance: number;
}

interface PartnerStatus {
  linked: boolean;
  olympUserId?: number;
  email?: string;
  suggestedEmail?: string;
  accountGroup?: "real" | "demo";
  tradingEnabled?: boolean;
  baseAmount?: number;
  accounts?: PartnerAccount[];
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
  const [ticker, setTicker] = useState("");
  const [amount, setAmount] = useState(1);
  const [durationSecs, setDurationSecs] = useState(60);
  const [tradeGroup, setTradeGroup] = useState<"real" | "demo">("demo");
  const [pending, setPending] = useState<"buy" | "sell" | null>(null);
  const [showClaim, setShowClaim] = useState(false);
  const [claimId, setClaimId] = useState("");
  const [claimBalance, setClaimBalance] = useState("");
  const [createEmail, setCreateEmail] = useState("");

  const { data: status, isLoading } = useQuery<PartnerStatus>({
    queryKey: ["admin-olymp-partner-status"],
    queryFn: async () => (await api.get<PartnerStatus>("/olymp-partner/status")).data,
  });

  const { data: pairData } = useQuery<{ pairs: OlympPairOption[]; unavailable?: boolean }>({
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

  const selectedPair = pairsById.get(ticker.trim().toUpperCase());
  const durationChoices = selectedPair?.durationChoices ?? FALLBACK_DURATIONS;
  const effectiveDuration = durationChoices.includes(durationSecs)
    ? durationSecs
    : durationChoices.reduce(
        (best, secs) => (Math.abs(secs - durationSecs) < Math.abs(best - durationSecs) ? secs : best),
        durationChoices[0] ?? 60,
      );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-olymp-partner-status"] });
    queryClient.invalidateQueries({ queryKey: ["admin-olymp-live-trades"] });
  };

  const createMutation = useMutation({
    mutationFn: async () =>
      (await api.post("/olymp-partner/account", createEmail.trim() ? { email: createEmail.trim() } : {})).data,
    onSuccess: () => {
      toast.success("Olymp account created and linked");
      setCreateEmail("");
      invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? err?.message ?? "Could not create the account"),
  });

  const claimMutation = useMutation({
    mutationFn: async () =>
      (await api.post("/olymp-partner/claim", {
        olympUserId: Number(claimId),
        confirmBalance: Number(claimBalance),
      })).data,
    onSuccess: () => {
      toast.success("Olymp account connected");
      setShowClaim(false);
      setClaimId("");
      setClaimBalance("");
      invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? err?.message ?? "Could not connect that account"),
  });

  const tradeMutation = useMutation({
    mutationFn: async (direction: "buy" | "sell") => {
      const res = await api.post<AdminTradeResult>("/admin/olymp-accounts/partner-trade", {
        direction,
        ticker: ticker.trim().toUpperCase(),
        amount,
        durationSecs: effectiveDuration,
        group: tradeGroup,
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
        toast.success(headline, { description: "Your account only — mirroring is switched off." });
      } else if (result.skipped === "account-not-real") {
        toast.success(headline, { description: "Your account only — followers are never copied from a practice account." });
      } else {
        toast.warning(headline, { description: result.error ?? "Your deal is open, but copying to followers failed." });
      }
      invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? err?.message ?? "Failed to place the trade"),
    onSettled: () => setPending(null),
  });

  if (isLoading) {
    return (
      <div className="flex h-28 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ---------------------------------------------------------------- unlinked
  if (!status?.linked) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-white">Your Olymp trading account</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          This is the account your Buy and Sell presses trade, and the one followers copy. NOJAI
          creates it through the Olymp Partner API — no token to paste, and nothing to reconnect
          every two days.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="min-w-[14rem] flex-1">
            <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Email for the Olymp account
            </Label>
            <Input
              className="mt-1"
              placeholder={status?.suggestedEmail ?? "you@example.com"}
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
            />
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
            Create account
          </Button>
          <Button variant="outline" onClick={() => setShowClaim((open) => !open)}>
            <Link2 className="mr-1.5 h-3.5 w-3.5" /> I already have one
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Leave the email blank to use your NOJAI address. Olymp can only create accounts, never
          adopt one that already exists on an address — if yours is taken, use a different one or
          connect the existing account instead.
        </p>

        {showClaim && (
          <div className="mt-4 rounded-2xl border border-white/[0.06] bg-black/10 p-4">
            <p className="text-xs font-semibold text-white">Connect an Olymp account you already have</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Only works for an account that joined Olymp through our partner link. The balance is
              asked for as proof you hold it.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div className="w-40">
                <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Olymp user id</Label>
                <Input className="mt-1" value={claimId} onChange={(e) => setClaimId(e.target.value)} placeholder="1234567" />
              </div>
              <div className="w-40">
                <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Demo balance</Label>
                <Input className="mt-1" value={claimBalance} onChange={(e) => setClaimBalance(e.target.value)} placeholder="10000" />
              </div>
              <Button
                variant="outline"
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending || !claimId.trim() || !claimBalance.trim()}
              >
                {claimMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                Connect
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------------ linked
  const accounts = status.accounts ?? [];
  const activeAccount = accounts.find((account) => account.type === tradeGroup);
  const canTrade = Boolean(ticker.trim()) && amount >= 1 && Boolean(activeAccount);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Your Olymp trading account</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <Badge variant="success" className="text-[10px]">Partner</Badge>
            <span>Olymp id {status.olympUserId}</span>
            {status.email ? <span>· {status.email}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => setTradeGroup(account.type)}
              className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                tradeGroup === account.type
                  ? "border-emerald-400 bg-emerald-500/10"
                  : "border-white/[0.08] hover:border-white/20"
              }`}
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {account.type === "real" ? "Real" : "Demo"}
              </p>
              <p className="mt-0.5 text-sm font-semibold">{formatCurrency(account.balance, account.currency)}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-white/[0.06] pt-4">
        <div className="min-w-[12rem] flex-1">
          <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Instrument{pairs.length > 0 ? ` (${pairs.length})` : ""}
          </Label>
          {catalogueUnavailable ? (
            <Input className="mt-1" placeholder="EURUSD" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} />
          ) : (
            <select
              className="mt-1 h-10 w-full rounded-md border border-white/[0.08] bg-black/20 px-3 text-sm text-foreground"
              value={ticker}
              onChange={(e) => {
                setTicker(e.target.value);
                const next = pairsById.get(e.target.value);
                if (next && !next.durationChoices.includes(durationSecs)) {
                  setDurationSecs(next.durationChoices.find((secs) => secs >= durationSecs) ?? next.durationChoices[0] ?? 60);
                }
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
          <Input className="mt-1" type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
        <div className="w-28">
          <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Expiry</Label>
          <select
            className="mt-1 h-10 w-full rounded-md border border-white/[0.08] bg-black/20 px-3 text-sm text-foreground"
            value={effectiveDuration}
            onChange={(e) => setDurationSecs(Number(e.target.value))}
          >
            {durationChoices.map((secs) => (
              <option key={secs} value={secs}>{formatDuration(secs)}</option>
            ))}
          </select>
        </div>
        <Button
          className="bg-emerald-600 text-white hover:bg-emerald-500"
          disabled={!canTrade || tradeMutation.isPending}
          onClick={() => { setPending("buy"); tradeMutation.mutate("buy"); }}
        >
          {pending === "buy" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="mr-1.5 h-3.5 w-3.5" />}
          Buy
        </Button>
        <Button
          className="bg-red-600 text-white hover:bg-red-500"
          disabled={!canTrade || tradeMutation.isPending}
          onClick={() => { setPending("sell"); tradeMutation.mutate("sell"); }}
        >
          {pending === "sell" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <TrendingDown className="mr-1.5 h-3.5 w-3.5" />}
          Sell
        </Button>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        {!activeAccount
          ? `Olymp reports no ${tradeGroup} account on this login.`
          : !ticker.trim()
            ? catalogueUnavailable
              ? "Instrument list unavailable — type the name as Olymp spells it."
              : "Choose an instrument to trade."
            : selectedPair && !selectedPair.isOpen
              ? `${selectedPair.title} is outside its trading hours — Olymp will probably reject this.`
              : tradeGroup === "real"
                ? `Places ${formatCurrency(amount, activeAccount.currency)} for ${formatDuration(effectiveDuration)} on your real account and copies it to followers who opted in.`
                : `Practice account — places ${formatCurrency(amount, activeAccount.currency)} for ${formatDuration(effectiveDuration)} here only. Followers are never copied from a practice account.`}
      </p>
    </div>
  );
}
