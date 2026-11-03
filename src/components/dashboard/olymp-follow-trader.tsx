"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Copy, Loader2, Radio } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";

/**
 * Following the NOJAI trader's hand-placed Olymp trades.
 *
 * This began as a row inside the account card's settings, under the trade
 * amount, greyed out whenever automated trading was off. That buried the one
 * feature a user is most likely to want and made its most common first state —
 * disabled — look broken. It is a panel of its own now.
 *
 * It also shows what is being followed. Asking someone to copy a person while
 * telling them nothing about that person's recent trades leaves them no basis
 * for the decision, so the last few hand-placed trades and how they went are
 * here next to the switch.
 *
 * Amounts are deliberately absent: the stake shown would be the trader's, not
 * the follower's, and a follower always trades their own amount.
 */

interface FollowTrade {
  asset: string;
  direction: "call" | "put";
  status: "open" | "won" | "lost" | "draw" | "error";
  openedAt: string;
}

interface FollowStatus {
  linked: boolean;
  enabled: boolean;
  /** Automated trading is off, so copies could not be placed anyway. */
  requiresTrading: boolean;
  mirrorEnabled: boolean;
  traderOnline: boolean;
  available: boolean;
  recent: FollowTrade[];
  settled: number;
  won: number;
}

const QUERY_KEY = ["olymp-copy-admin"];

function timeOf(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function OlympFollowTrader() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<FollowStatus>({
    queryKey: QUERY_KEY,
    queryFn: async () => (await api.get("/olymp-partner/copy-admin")).data as FollowStatus,
    refetchInterval: 60_000,
  });

  const toggle = useMutation({
    mutationFn: async (enabled: boolean) =>
      (await api.patch("/olymp-partner/settings", { copyAdminEnabled: enabled })).data,
    onSuccess: (_result, enabled) => {
      toast.success(
        enabled
          ? "You're now following the NOJAI trader's manual trades."
          : "You've stopped following the NOJAI trader.",
      );
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["olymp-partner-status"] });
    },
    onError: (error: Error) => toast.error(error.message || "Could not change this setting"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  // Nothing to follow with until an Olymp account is connected.
  if (!data?.linked) return null;

  const winRate = data.settled > 0 ? Math.round((data.won / data.settled) * 100) : null;

  return (
    <div className="dashboard-solid-panel space-y-4 rounded-2xl border border-primary/30 bg-primary/[0.04] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Copy className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold tracking-tight">Copy the NOJAI trader</h2>
            {data.enabled ? <Badge variant="success">Following</Badge> : null}
            {data.available && !data.enabled ? <Badge variant="secondary">Available</Badge> : null}
          </div>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            When our trader opens a trade by hand on Olymp, the same trade is opened on your account —
            same asset, same direction, <span className="text-foreground">your own amount</span>. This is
            separate from the automatic signals, which you already receive.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Switch
            checked={data.enabled}
            disabled={toggle.isPending || data.requiresTrading}
            onCheckedChange={(checked) => toggle.mutate(checked)}
            aria-label="Copy the NOJAI trader"
          />
        </div>
      </div>

      {/* Each of these is a different thing to do about it, so they are
          distinguished rather than collapsed into one "unavailable". */}
      {data.requiresTrading ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-3 text-[11px] leading-5 text-amber-100">
          <span className="font-semibold">Turn on automated trading first.</span> Copied trades are placed
          on the same Olymp account the bot trades, so that has to be on before this can do anything. The
          switch is just below.
        </div>
      ) : !data.mirrorEnabled ? (
        <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3 text-[11px] leading-5 text-muted-foreground">
          <span className="font-semibold text-foreground">Not running right now.</span> Our trader has
          copying switched off at the moment. You can turn this on and it will start working as soon as
          they switch it back on — nothing will be placed in the meantime.
        </div>
      ) : !data.traderOnline ? (
        <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3 text-[11px] leading-5 text-muted-foreground">
          <span className="font-semibold text-foreground">Our trader is offline.</span> Nothing will be
          copied until they are back. You can leave this on — it will pick up again by itself.
        </div>
      ) : data.enabled ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-3 text-[11px] leading-5 text-emerald-100">
          <Radio className="h-3.5 w-3.5 shrink-0 animate-pulse" />
          <span>
            <span className="font-semibold">Live.</span> The next trade our trader places by hand will be
            placed on your account too.
          </span>
        </div>
      ) : null}

      {/* What they would have copied. The decision is about a person, so the
          page should say something about how that person has been trading. */}
      {data.recent.length > 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recent hand-placed trades
            </p>
            {winRate !== null ? (
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">{data.won}/{data.settled}</span> won
                {" · "}{winRate}%
              </p>
            ) : null}
          </div>

          <ul className="mt-2.5 space-y-1.5">
            {data.recent.map((trade, index) => (
              <li key={`${trade.asset}-${trade.openedAt}-${index}`} className="flex items-center gap-2 text-xs">
                {trade.direction === "call"
                  ? <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  : <ArrowDownRight className="h-3.5 w-3.5 shrink-0 text-red-400" />}
                <span className="font-medium">{trade.asset}</span>
                <span className="text-muted-foreground">{trade.direction === "call" ? "up" : "down"}</span>
                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{timeOf(trade.openedAt)}</span>
                <span className={`shrink-0 text-[11px] font-medium ${
                  trade.status === "won" ? "text-emerald-400"
                    : trade.status === "lost" ? "text-red-400"
                      : "text-muted-foreground"
                }`}>
                  {trade.status === "open" ? "open" : trade.status}
                </span>
              </li>
            ))}
          </ul>

          {/* Stated because the list is short and someone will wonder why. */}
          <p className="mt-2.5 text-[10px] leading-4 text-muted-foreground">
            Recent activity only — this list starts fresh when our systems restart. Past results are not a
            promise of future ones.
          </p>
        </div>
      ) : data.available ? (
        <p className="text-[11px] leading-5 text-muted-foreground">
          No hand-placed trades yet today. Turn this on now and you will be included in the next one.
        </p>
      ) : null}
    </div>
  );
}
