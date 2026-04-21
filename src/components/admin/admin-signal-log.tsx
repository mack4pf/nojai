"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowDownRight, ArrowUpRight, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface SignalResultSummary {
  status: "executed" | "skipped" | "failed";
  martingaleStep?: number;
}

interface SignalEntry {
  _id: string;
  ticker: string;
  direction: "buy" | "sell";
  expirationSecs?: number;
  botTarget: "pro" | "vip" | "mixed";
  botTargets?: Array<"pro" | "vip">;
  totalUsers: number;
  executedCount: number;
  skippedCount: number;
  failedCount: number;
  results: SignalResultSummary[];
  receivedAt: string;
}

interface SignalsResponse {
  signals: SignalEntry[];
  total: number;
  page: number;
  pages: number;
}

function getMartingaleLabel(results: SignalResultSummary[]): string {
  const steps = results
    .filter((r) => typeof r.martingaleStep === "number")
    .map((r) => r.martingaleStep as number);

  if (steps.length === 0) return "—";

  const max = Math.max(...steps);
  const placements = steps.filter((s) => s > 0).length;

  if (placements === 0) return "Base (Step 0)";
  return `Up to Step ${max} · ${placements} account${placements !== 1 ? "s" : ""}`;
}

export function AdminSignalLog() {
  const [page, setPage] = useState(1);
  const [targetFilter, setTargetFilter] = useState<"all" | "pro" | "vip">("all");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-signal-log", page, targetFilter],
    queryFn: async () => {
      const res = await api.get<SignalsResponse>("/admin/signals", {
        params: {
          page,
          limit: 20,
          botTarget: targetFilter === "all" ? undefined : targetFilter,
        },
      });
      return res.data;
    },
    retry: 1,
  });

  const signals = data?.signals ?? [];
  const pages = data?.pages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Total</p>
          <p className="mt-1 font-display text-xl font-bold">{total}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">This page</p>
          <p className="mt-1 font-display text-xl font-bold">{signals.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Executed</p>
          <p className="mt-1 font-display text-xl font-bold text-emerald-300">
            {signals.reduce((sum, s) => sum + s.executedCount, 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-400">Failed</p>
          <p className="mt-1 font-display text-xl font-bold text-red-300">
            {signals.reduce((sum, s) => sum + s.failedCount, 0)}
          </p>
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(["all", "vip", "pro"] as const).map((f) => (
          <button
            key={f}
            onClick={() => {
              setTargetFilter(f);
              setPage(1);
            }}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
              targetFilter === f
                ? "bg-white/[0.1] text-foreground"
                : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
            }`}
          >
            {f === "all" ? "All signals" : `${f.toUpperCase()} only`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 p-5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Failed to load signals. Try refreshing.
          </div>
        ) : signals.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No signals received yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-5 py-4">Time received</th>
                  <th className="px-5 py-4">Asset</th>
                  <th className="px-5 py-4">Direction</th>
                  <th className="px-5 py-4">Target</th>
                  <th className="px-5 py-4">Result</th>
                  <th className="px-5 py-4">Martingale</th>
                  <th className="px-5 py-4">Accounts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {signals.map((signal) => {
                  const targets = signal.botTargets?.length ? signal.botTargets : [signal.botTarget];
                  const executionRate =
                    signal.totalUsers > 0
                      ? Math.round((signal.executedCount / signal.totalUsers) * 100)
                      : 0;
                  const isSuccess = signal.executedCount > 0 && signal.failedCount === 0;
                  const isPartial = signal.executedCount > 0 && signal.failedCount > 0;
                  const isFailed = signal.executedCount === 0 && signal.failedCount > 0;

                  return (
                    <tr key={signal._id} className="transition-colors hover:bg-white/[0.02]">
                      {/* Time */}
                      <td className="px-5 py-4 text-muted-foreground">
                        {formatDate(signal.receivedAt, "MMM d · HH:mm:ss")}
                      </td>

                      {/* Asset */}
                      <td className="px-5 py-4">
                        <span className="font-semibold text-foreground">{signal.ticker}</span>
                        {signal.expirationSecs ? (
                          <span className="ml-2 text-xs text-muted-foreground">{signal.expirationSecs}s</span>
                        ) : null}
                      </td>

                      {/* Direction */}
                      <td className="px-5 py-4">
                        {signal.direction === "buy" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                            <ArrowUpRight className="h-3 w-3" />
                            Buy
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-300">
                            <ArrowDownRight className="h-3 w-3" />
                            Sell
                          </span>
                        )}
                      </td>

                      {/* Target */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {targets.map((t) => (
                            <span
                              key={t}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                t === "vip"
                                  ? "bg-amber-500/15 text-amber-300"
                                  : t === "pro"
                                    ? "bg-violet-500/15 text-violet-300"
                                    : "bg-white/[0.08] text-muted-foreground"
                              }`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Result (win/loss) */}
                      <td className="px-5 py-4">
                        {isSuccess ? (
                          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                            Win · {executionRate}%
                          </span>
                        ) : isPartial ? (
                          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                            Partial · {executionRate}%
                          </span>
                        ) : isFailed ? (
                          <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-300">
                            Loss
                          </span>
                        ) : (
                          <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Skipped
                          </span>
                        )}
                      </td>

                      {/* Martingale */}
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        {getMartingaleLabel(signal.results)}
                      </td>

                      {/* Accounts */}
                      <td className="px-5 py-4">
                        <span className="text-foreground">{signal.executedCount}</span>
                        <span className="text-muted-foreground">/{signal.totalUsers}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1 || isFetching}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pages}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages || isFetching}>
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
