"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Loader2, Radio } from "lucide-react";
import { toast } from "sonner";

import { useSession } from "next-auth/react";
import { io } from "socket.io-client";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { api, BACKEND_ORIGIN, SOCKET_PROXY_PATH } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

/**
 * The admin's Olymp trading as it happens, and the switch that decides whether
 * followers get a copy.
 *
 * Trades arrive over the socket, so this reflects a placement within a second
 * of it happening rather than whenever a poll next lands. The fetch below is
 * only the initial fill; polling continues at a slow interval purely as a
 * safety net for a dropped socket.
 *
 * What makes it worth watching is the mirror column: a manual trade's value to
 * an admin is not "did mine go through" but "did it reach the people
 * following me".
 */

const QUERY_KEY = ["admin-olymp-live-trades"];

type TradeOrigin = "manual" | "signal" | "mirror";

interface AdminOlympTrade {
  tradeId: string;
  accountId: string;
  accountName?: string;
  asset: string;
  direction: "call" | "put";
  amount: number;
  expirationSecs: number;
  currency: string;
  origin: TradeOrigin;
  status: "open" | "won" | "lost" | "draw" | "error";
  profit?: number;
  openedAt: string;
  settledAt?: string;
  mirror?: { attempted: number; placed: number; failed: number };
}

interface FeedResponse {
  trades: AdminOlympTrade[];
  mirrorEnabled: boolean;
}

const ORIGIN_LABEL: Record<TradeOrigin, string> = {
  manual: "By hand",
  signal: "Signal",
  mirror: "Mirrored",
};

function timeOf(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function AdminOlympLiveTrades() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [live, setLive] = useState(false);

  const { data, isLoading } = useQuery<FeedResponse>({
    queryKey: QUERY_KEY,
    queryFn: async () => (await api.get("/admin/olymp-accounts/trades?limit=100")).data as FeedResponse,
    // The socket is the real transport. This is a slow backstop in case it
    // drops, not the mechanism.
    refetchInterval: 30_000,
  });

  const mirrorMutation = useMutation({
    mutationFn: async (enabled: boolean) =>
      (await api.put("/admin/olymp-accounts/mirror", { enabled })).data as { enabled: boolean },
    onSuccess: (result) => {
      toast.success(
        result.enabled
          ? "Mirror trading is ON — your manual trades will be copied to followers"
          : "Mirror trading is OFF",
      );
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to change mirror trading"),
  });

  useEffect(() => {
    const token = session?.accessToken;
    if (!token) return;

    // Its own connection rather than the dashboard's: this page is admin-only
    // and the dashboard socket hook is not mounted here.
    const socket = io(BACKEND_ORIGIN, {
      path: SOCKET_PROXY_PATH,
      auth: { token },
      transports: ["polling", "websocket"],
      reconnectionAttempts: 10,
    });

    socket.on("connect", () => setLive(true));
    socket.on("disconnect", () => setLive(false));

    const onTrade = (incoming: AdminOlympTrade) => {
      queryClient.setQueryData<FeedResponse>(QUERY_KEY, (current) => {
        const existing = current?.trades ?? [];
        const without = existing.filter((trade) => trade.tradeId !== incoming.tradeId);
        // A settlement for a trade already listed replaces it in place rather
        // than appearing as a second row for the same deal.
        const wasListed = without.length !== existing.length;
        const next = wasListed
          ? existing.map((trade) => (trade.tradeId === incoming.tradeId ? incoming : trade))
          : [incoming, ...existing].slice(0, 100);
        return { trades: next, mirrorEnabled: current?.mirrorEnabled ?? false };
      });
    };

    socket.on("olymp-admin-trade", onTrade);
    return () => {
      socket.off("olymp-admin-trade", onTrade);
      socket.disconnect();
    };
  }, [queryClient, session?.accessToken]);

  const trades = data?.trades ?? [];
  const mirrorEnabled = Boolean(data?.mirrorEnabled);

  const counts = useMemo(() => ({
    open: trades.filter((trade) => trade.status === "open").length,
    manual: trades.filter((trade) => trade.origin === "manual").length,
    mirrored: trades.reduce((total, trade) => total + (trade.mirror?.placed ?? 0), 0),
  }), [trades]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            Live trading
            {live && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                <Radio className="h-3 w-3 animate-pulse" /> live
              </span>
            )}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Every deal on your Olymp accounts, as it happens. Kept in memory, so this clears on restart —
            the Trades page is the permanent record.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
          <div className="text-right">
            <p className="text-xs font-semibold">Mirror to followers</p>
            <p className="text-[11px] text-muted-foreground">
              {mirrorEnabled ? "Your manual trades are being copied" : "Off — nothing is copied"}
            </p>
          </div>
          <Switch
            checked={mirrorEnabled}
            onCheckedChange={(enabled) => mirrorMutation.mutate(enabled)}
            disabled={mirrorMutation.isPending || isLoading}
          />
        </div>
      </div>

      {/* Spelling out the consequence next to the switch, because turning it on
          places trades with other people's money. */}
      <div className={`rounded-xl border p-3 text-[11px] leading-5 ${
        mirrorEnabled
          ? "border-amber-500/30 bg-amber-500/[0.08] text-amber-100"
          : "border-white/[0.06] bg-white/[0.02] text-muted-foreground"
      }`}>
        {mirrorEnabled ? (
          <>
            <span className="font-semibold">Mirroring is on.</span> Any trade you place by hand in Olymp
            is copied to every user who turned on &quot;Follow admin trades&quot;, at their own stake and
            martingale step. Trades the bot places from signals are not copied — those users already
            receive the signal. Only trades from a real-money account of yours are mirrored.
          </>
        ) : (
          <>
            <span className="font-semibold">Mirroring is off.</span> Your trades show here but are not
            copied to anyone. Users who enabled &quot;Follow admin trades&quot; will receive nothing until
            this is switched on.
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Open now", value: counts.open },
          { label: "Placed by hand", value: counts.manual },
          { label: "Copies placed", value: counts.mirrored },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="font-display text-xl font-semibold">{item.value}</p>
            <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading recent trades…
        </div>
      ) : trades.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-12 text-center">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Nothing yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Trades appear here the moment they are placed on a connected admin account.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-white/[0.03]">
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium">Direction</th>
                <th className="px-4 py-3 font-medium">Stake</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Result</th>
                <th className="px-4 py-3 font-medium">Copies</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.tradeId} className="border-t border-white/[0.05]">
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {timeOf(trade.settledAt ?? trade.openedAt)}
                    <span className="mt-0.5 block text-[10px]">#{trade.accountId}</span>
                  </td>
                  <td className="px-4 py-3 font-medium">{trade.asset}</td>
                  <td className="px-4 py-3">
                    <span className={trade.direction === "call" ? "text-emerald-400" : "text-red-400"}>
                      {trade.direction === "call" ? "CALL" : "PUT"}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">{trade.expirationSecs}s</span>
                  </td>
                  <td className="px-4 py-3">{formatCurrency(trade.amount, trade.currency)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={trade.origin === "manual" ? "default" : "secondary"}>
                      {ORIGIN_LABEL[trade.origin]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {trade.status === "open" ? (
                      <span className="text-xs text-amber-300">open</span>
                    ) : (
                      <>
                        <Badge variant={
                          trade.status === "won" ? "success"
                            : trade.status === "lost" ? "destructive"
                              : "secondary"
                        }>
                          {trade.status}
                        </Badge>
                        {trade.profit !== undefined && (
                          <span className={`mt-0.5 block text-[10px] ${trade.profit > 0 ? "text-emerald-400" : trade.profit < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                            {trade.profit > 0 ? "+" : ""}{formatCurrency(trade.profit, trade.currency)}
                          </span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {trade.origin !== "manual" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : trade.mirror ? (
                      <>
                        <span className="font-medium text-emerald-400">{trade.mirror.placed}</span>
                        <span className="text-muted-foreground"> / {trade.mirror.attempted}</span>
                        {trade.mirror.failed > 0 && (
                          <span className="mt-0.5 block text-[10px] text-red-400">{trade.mirror.failed} failed</span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">{mirrorEnabled ? "sending…" : "not copied"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
