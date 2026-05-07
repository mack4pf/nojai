"use client";

import React, { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowDownRight, ArrowUpRight, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface SignalResultSummary {
  rowId?: string;
  userId: string;
  email: string;
  fullName?: string;
  broker?: "iq" | "eo";
  accountId?: string;
  accountName?: string;
  accountMode?: string;
  status: "executed" | "skipped" | "failed";
  reason?: string;
  amount?: number;
  currency?: string;
  martingaleStep?: number;
  tradeId?: string | null;
  tradeStatus?: "pending" | "open" | "closed" | "error" | "skipped" | "failed";
  tradeResult?: "pending" | "won" | "lost" | "error" | "skipped" | "failed";
  profit?: number | null;
}

interface SignalEntry {
  _id: string;
  dispatchId: string;
  ticker: string;
  direction: "buy" | "sell";
  expirationSecs?: number;
  broker?: "iq" | "eo" | "mixed";
  botTarget: "pro" | "vip" | "eo-pro" | "eo-vip" | "mixed";
  botTargets?: Array<"pro" | "vip" | "eo-pro" | "eo-vip">;
  source: string;
  totalUsers: number;
  executedCount: number;
  skippedCount: number;
  failedCount: number;
  results: SignalResultSummary[];
  receivedAt: string;
  completedAt: string;
}

interface SignalsResponse {
  signals: SignalEntry[];
  total: number;
  page: number;
  pages: number;
}

function getMartingaleLabel(results: SignalResultSummary[]): string {
  const steps = (results || [])
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
  const [brokerFilter, setBrokerFilter] = useState<"all" | "iq" | "eo">("all");
  const [targetFilter, setTargetFilter] = useState<"all" | "pro" | "vip">("all");
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-signal-log", page, brokerFilter, targetFilter],
    queryFn: async () => {
      const res = await api.get<SignalsResponse>("/admin/signals", {
        params: {
          page,
          limit: 20,
          broker: brokerFilter === "all" ? undefined : brokerFilter,
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
        {(["all", "iq", "eo"] as const).map((f) => (
          <button
            key={f}
            onClick={() => {
              setBrokerFilter(f);
              setPage(1);
            }}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
              brokerFilter === f
                ? "bg-white/[0.1] text-foreground"
                : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
            }`}
          >
            {f === "all" ? "All brokers" : f === "iq" ? "IQ Option" : "ExpertOption"}
          </button>
        ))}
      </div>

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
            {f === "all" ? "All tiers" : `${f.toUpperCase()} only`}
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
                  <th className="px-5 py-4">Placement</th>
                  <th className="px-5 py-4">Result</th>
                  <th className="px-5 py-4">Martingale</th>
                  <th className="px-5 py-4">Accounts</th>
                  <th className="px-5 py-4 text-right">Details</th>
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
                  const isExpanded = expandedSignalId === signal._id;
                  const resultCounts = signal.results.reduce(
                    (counts, res) => {
                      if (res.tradeResult === "won") counts.won += 1;
                      else if (res.tradeResult === "lost") counts.lost += 1;
                      else if (res.tradeResult === "pending" || res.tradeStatus === "pending" || res.tradeStatus === "open") counts.pending += 1;
                      return counts;
                    },
                    { won: 0, lost: 0, pending: 0 },
                  );

                  return (
                    <React.Fragment key={signal._id}>
                      <tr className={`transition-colors hover:bg-white/[0.02] ${isExpanded ? "bg-white/[0.04]" : ""}`}>
                        {/* Time */}
                        <td className="px-5 py-4 text-muted-foreground text-xs">
                          {formatDate(signal.receivedAt, "MMM d · HH:mm:ss")}
                        </td>

                        {/* Asset */}
                        <td className="px-5 py-4">
                          <span className="font-semibold text-foreground">{signal.ticker}</span>
                          {signal.expirationSecs ? (
                            <span className="ml-2 text-[10px] text-muted-foreground">{signal.expirationSecs}s</span>
                          ) : null}
                        </td>

                        {/* Direction */}
                        <td className="px-5 py-4">
                          {signal.direction === "buy" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                              <ArrowUpRight className="h-3 w-3" />
                              Buy
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-300">
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
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                                  t === "vip"
                                    ? "bg-amber-500/15 text-amber-300"
                                    : t === "pro"
                                      ? "bg-violet-500/15 text-violet-300"
                                      : "bg-white/[0.08] text-muted-foreground"
                                }`}
                              >
                                {t.replace("eo-", "EO ")}
                              </span>
                            ))}
                            <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              {signal.broker === "eo" ? "EO" : signal.broker === "iq" ? "IQ" : "Mixed"}
                            </span>
                          </div>
                        </td>

                        {/* Placement */}
                        <td className="px-5 py-4">
                          {isSuccess ? (
                            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                              Executed · {executionRate}%
                            </span>
                          ) : isPartial ? (
                            <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                              Partial exec · {executionRate}%
                            </span>
                          ) : isFailed ? (
                            <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-300">
                              Failed
                            </span>
                          ) : (
                            <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Skipped
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs font-semibold">
                          <span className="text-emerald-300">{resultCounts.won}W</span>
                          <span className="mx-1 text-muted-foreground">/</span>
                          <span className="text-red-300">{resultCounts.lost}L</span>
                          <span className="mx-1 text-muted-foreground">/</span>
                          <span className="text-amber-300">{resultCounts.pending} pending</span>
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

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 ${isExpanded ? "bg-white/10" : ""}`}
                            onClick={() => setExpandedSignalId(isExpanded ? null : signal._id)}
                          >
                            <span className="sr-only">View results</span>
                            {isExpanded ? (
                              <ArrowDownRight className="h-4 w-4 rotate-45" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 -rotate-45" />
                            )}
                          </Button>
                        </td>
                      </tr>

                      {/* Detail View */}
                      {isExpanded && (
                        <tr className="bg-black/20 border-t-0">
                          <td colSpan={9} className="px-5 py-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Account Breakdown</h4>
                                <span className="text-[10px] text-muted-foreground font-mono">ID: {signal.dispatchId}</span>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {signal.results?.map((res, i) => (
                                  <div
                                    key={res.rowId ?? `${signal._id}-${res.userId}-${res.accountId ?? res.email}-${res.status}-${i}`}
                                    className={`rounded-lg border p-2.5 text-xs ${
                                      res.status === "executed"
                                        ? "border-emerald-500/20 bg-emerald-500/5"
                                        : res.status === "failed"
                                          ? "border-red-500/20 bg-red-500/5"
                                          : "border-white/5 bg-white/[0.02]"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-foreground">{res.fullName || res.email || "Unknown user"}</p>
                                        <p className="truncate font-mono text-[10px] text-muted-foreground">{res.email || "No email"}</p>
                                        <p className="truncate font-mono text-[10px] text-muted-foreground">
                                          {res.broker === "eo" ? "EO" : "IQ"} ID: {res.accountId || res.userId}
                                          {res.accountName ? ` · ${res.accountName}` : ""}
                                          {res.accountMode ? ` · ${res.accountMode}` : ""}
                                        </p>
                                      </div>
                                      <span
                                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                          res.status === "executed"
                                            ? "bg-emerald-500/20 text-emerald-400"
                                            : res.status === "failed"
                                              ? "bg-red-500/20 text-red-400"
                                              : "bg-white/10 text-muted-foreground"
                                        }`}
                                      >
                                        {res.status}
                                      </span>
                                    </div>
                                    {res.status === "executed" && (
                                      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/5 pt-2">
                                        <span className="text-[10px] font-bold text-foreground">
                                          ${res.amount}
                                        </span>
                                        <span className="text-[9px] text-muted-foreground uppercase">
                                          Step {res.martingaleStep ?? 0}
                                        </span>
                                        <span
                                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                            res.tradeResult === "won"
                                              ? "bg-emerald-500/20 text-emerald-400"
                                              : res.tradeResult === "lost" || res.tradeResult === "error"
                                                ? "bg-red-500/20 text-red-400"
                                                : "bg-amber-500/20 text-amber-300"
                                          }`}
                                        >
                                          {res.tradeResult ?? "pending"}
                                        </span>
                                        {typeof res.profit === "number" && (
                                          <span className={`text-[10px] font-bold ${res.profit >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                                            {res.profit >= 0 ? "+" : ""}${res.profit}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {res.status === "failed" && res.reason && (
                                      <div className="mt-2 border-t border-white/5 pt-2">
                                        <p className="text-[10px] leading-relaxed text-red-300 italic">
                                          "{res.reason}"
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
