"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ChevronDown, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

interface SignalResult {
  rowId?: string;
  userId: string;
  email: string;
  fullName?: string;
  broker?: "iq" | "eo" | "mt5";
  botTarget?: "pro" | "vip" | "eo-pro" | "eo-vip";
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
  closeTime?: string | null;
}

interface SignalLog {
  _id: string;
  dispatchId?: string;
  ticker: string;
  direction: "buy" | "sell";
  expirationSecs: number;
  broker?: "iq" | "eo" | "mt5" | "mixed";
  strategyName?: string;
  strategySlug?: string;
  strategySymbol?: string;
  botTarget: "pro" | "vip" | "eo-pro" | "eo-vip" | "mt5-global" | "mt5-user" | "mixed";
  botTargets?: Array<"pro" | "vip" | "eo-pro" | "eo-vip" | "mt5-global" | "mt5-user">;
  source: "tradingview" | "webhook" | "admin_manual" | "mt5_global_webhook" | "mt5_per_account_webhook" | "mixed";
  sources?: Array<"tradingview" | "webhook" | "admin_manual" | "mt5_global_webhook" | "mt5_per_account_webhook">;
  totalUsers: number;
  executedCount: number;
  skippedCount: number;
  failedCount: number;
  results: SignalResult[];
  receivedAt: string;
  completedAt?: string;
}

interface SignalsResponse {
  signals: SignalLog[];
  total: number;
  page: number;
  pages: number;
}

const QUERY_KEY = "admin-signals";

function ResultBadge({ result }: { result?: SignalResult["tradeResult"] }) {
  const value = result ?? "pending";
  const cls =
    value === "won"
      ? "bg-emerald-500/15 text-emerald-300"
      : value === "lost" || value === "error" || value === "failed"
        ? "bg-red-500/15 text-red-300"
        : value === "skipped"
          ? "bg-white/[0.08] text-muted-foreground"
          : "bg-amber-500/15 text-amber-300";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${cls}`}>
      {value}
    </span>
  );
}

function PlacementBadge({ status }: { status: SignalResult["status"] }) {
  const cls =
    status === "executed"
      ? "bg-blue-500/15 text-blue-300"
      : status === "failed"
        ? "bg-red-500/15 text-red-300"
        : "bg-white/[0.08] text-muted-foreground";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${cls}`}>
      {status}
    </span>
  );
}

export function AdminSignalsManager() {
  const [page, setPage] = useState(1);
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);
  const [brokerFilter, setBrokerFilter] = useState<"all" | "iq" | "eo" | "mt5">("all");
  const [botFilter, setBotFilter] = useState<"all" | "pro" | "vip" | "mt5">("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: [QUERY_KEY, page, brokerFilter, botFilter],
    queryFn: async () => {
      const res = await api.get<SignalsResponse>("/admin/signals", {
        params: {
          page,
          limit: 10,
          broker: brokerFilter === "all" ? undefined : brokerFilter,
          botTarget: botFilter === "all" ? undefined : botFilter,
        },
      });
      return res.data;
    },
    retry: 1,
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
        Failed to load signal logs
      </div>
    );
  }

  const signals = data?.signals ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;
  const normalizedSearch = search.trim().toLowerCase();
  const filteredSignals = normalizedSearch
    ? signals.filter((signal) => {
        const emailMatch = signal.results.some((result) => result.email.toLowerCase().includes(normalizedSearch));
        return signal.ticker.toLowerCase().includes(normalizedSearch) || emailMatch;
      })
    : signals;

  const pageSummary = filteredSignals.reduce(
    (summary, signal) => {
      summary.targeted += signal.totalUsers;
      summary.executed += signal.executedCount;
      summary.failed += signal.failedCount;
      summary.skipped += signal.skippedCount;
      summary.won += signal.results.filter((result) => result.tradeResult === "won").length;
      summary.lost += signal.results.filter((result) => result.tradeResult === "lost").length;
      summary.pending += signal.results.filter((result) => result.tradeResult === "pending" || result.tradeStatus === "pending" || result.tradeStatus === "open").length;
      return summary;
    },
    { targeted: 0, executed: 0, failed: 0, skipped: 0, won: 0, lost: 0, pending: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Trade history</p>
          <h2 className="mt-2 text-xl font-bold">Signal execution, account attempts, and martingale steps</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review each signal, see how many accounts received it, how many executions were attempted, and which martingale step was used for every placement.
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Signals loaded</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground">{filteredSignals.length}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Total signals</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground">{total}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Executed</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground">{pageSummary.executed}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Results</p>
              <p className="mt-2 text-sm font-semibold">
                <span className="text-emerald-300">{pageSummary.won}W</span>
                <span className="mx-1 text-muted-foreground">/</span>
                <span className="text-red-300">{pageSummary.lost}L</span>
                <span className="mx-1 text-muted-foreground">/</span>
                <span className="text-amber-300">{pageSummary.pending} pending</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-1">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Broker</p>
            <div className="inline-flex rounded-xl border border-white/[0.08] bg-black/20 p-1">
              {(["all", "iq", "eo", "mt5"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setBrokerFilter(filter);
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    brokerFilter === filter
                      ? "bg-white/[0.12] text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filter === "all" ? "All brokers" : filter === "iq" ? "IQ Option" : filter === "mt5" ? "MT5" : "ExpertOption"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tier</p>
            <div className="inline-flex rounded-xl border border-white/[0.08] bg-black/20 p-1">
              {(["all", "pro", "vip", "mt5"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setBotFilter(filter);
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    botFilter === filter
                      ? "bg-white/[0.12] text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filter === "all" ? "All Tiers" : filter === "pro" ? "PRO" : filter === "mt5" ? "MT5" : "VIP"}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full max-w-md">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by ticker or account email"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredSignals.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-sm text-muted-foreground">
            {signals.length === 0 ? "No signal history found yet." : "No signals matched your search on this page."}
          </div>
        ) : (
          filteredSignals.map((signal) => {
            const isExpanded = expandedSignalId === signal._id;
            const connectedEstimate = signal.executedCount + signal.failedCount;
            const martingaleCounts = signal.results.reduce<Record<string, number>>((counts, result) => {
              if (typeof result.martingaleStep === "number") {
                const stepKey = `Step ${result.martingaleStep}`;
                counts[stepKey] = (counts[stepKey] ?? 0) + 1;
              }
              return counts;
            }, {});
            const martingalePlacements = signal.results.filter((result) => typeof result.martingaleStep === "number" && result.martingaleStep > 0).length;
            const resultCounts = signal.results.reduce(
              (counts, result) => {
                if (result.tradeResult === "won") counts.won += 1;
                else if (result.tradeResult === "lost") counts.lost += 1;
                else if (result.tradeResult === "error" || result.tradeResult === "failed") counts.error += 1;
                else if (result.tradeResult === "pending" || result.tradeStatus === "pending" || result.tradeStatus === "open") counts.pending += 1;
                return counts;
              },
              { won: 0, lost: 0, pending: 0, error: 0 },
            );

            return (
              <div key={signal._id} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
                <button
                  onClick={() => setExpandedSignalId(isExpanded ? null : signal._id)}
                  className="flex w-full flex-col gap-4 px-5 py-5 text-left transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-foreground">{signal.ticker}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${signal.direction === "buy" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                          {signal.direction}
                        </span>
                        {(signal.botTargets?.length ? signal.botTargets : [signal.botTarget]).map((target) => (
                          <Badge key={`${signal._id}-${target}`} variant="secondary" className="bg-white/[0.08] text-muted-foreground uppercase">
                            {target.replace("eo-", "EO ").replace("mt5-", "MT5 ")}
                          </Badge>
                        ))}
                        <Badge variant="secondary" className="border border-white/10 bg-transparent text-muted-foreground">
                          {signal.broker === "eo" ? "ExpertOption" : signal.broker === "iq" ? "IQ Option" : signal.broker === "mt5" ? "MT5 AutoTrade" : "Mixed brokers"}
                        </Badge>
                        {signal.strategyName ? (
                          <Badge variant="secondary" className="border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                            {signal.strategyName}{signal.strategySymbol ? ` · ${signal.strategySymbol}` : ""}
                          </Badge>
                        ) : null}
                        {(signal.sources?.length ? signal.sources : [signal.source]).map((source) => (
                          <Badge key={`${signal._id}-${source}`} variant="secondary" className="border border-white/10 bg-transparent text-muted-foreground">
                            {source.replaceAll("_", " ")}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(signal.receivedAt, "MMM d, yyyy · HH:mm:ss")} · {signal.totalUsers} targeted accounts
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-start xl:self-center">
                      <div className="grid gap-2 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/8 bg-black/10 px-3 py-2 text-center">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Connected</p>
                          <p className="mt-1 text-sm font-semibold text-foreground">{connectedEstimate}</p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-black/10 px-3 py-2 text-center">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Executed</p>
                          <p className="mt-1 text-sm font-semibold text-foreground">{signal.executedCount}</p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-black/10 px-3 py-2 text-center">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Failed</p>
                          <p className="mt-1 text-sm font-semibold text-foreground">{signal.failedCount}</p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-black/10 px-3 py-2 text-center">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Result</p>
                          <p className="mt-1 text-xs font-semibold">
                            <span className="text-emerald-300">{resultCounts.won}W</span>
                            <span className="mx-1 text-muted-foreground">/</span>
                            <span className="text-red-300">{resultCounts.lost}L</span>
                            <span className="mx-1 text-muted-foreground">/</span>
                            <span className="text-amber-300">{resultCounts.pending}P</span>
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {Object.entries(martingaleCounts).length > 0 ? (
                      Object.entries(martingaleCounts).map(([step, count]) => (
                        <span key={step} className="rounded-full bg-white/[0.08] px-3 py-1 text-xs font-medium text-muted-foreground">
                          {step} × {count}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full bg-white/[0.08] px-3 py-1 text-xs font-medium text-muted-foreground">No martingale steps recorded</span>
                    )}
                  </div>
                </button>

                {isExpanded ? (
                  <div className="border-t border-white/[0.06] bg-black/10 p-5">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      {[
                        { label: "Targeted", value: signal.totalUsers },
                        { label: "Connected estimate", value: connectedEstimate },
                        { label: "Executed", value: signal.executedCount },
                        { label: "Failed", value: signal.failedCount },
                        { label: "Skipped", value: signal.skippedCount },
                      ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                          <p className="mt-2 text-lg font-semibold text-foreground">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 overflow-x-auto">
                      <table className="w-full min-w-[860px] text-sm">
                        <thead>
                          <tr className="border-b border-white/[0.06] text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            <th className="pb-3 pr-4">Account</th>
                            <th className="pb-3 pr-4">Placement</th>
                            <th className="pb-3 pr-4">Result</th>
                            <th className="pb-3 pr-4">Amount</th>
                            <th className="pb-3 pr-4">Martingale</th>
                            <th className="pb-3">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {signal.results.map((result, index) => (
                            <tr key={result.rowId ?? `${signal._id}-${result.userId}-${result.accountId ?? result.email}-${result.status}-${index}`}>
                              <td className="py-3 pr-4 font-medium text-foreground">
                                <div>
                                  <p>{result.fullName || result.email || "Unknown user"}</p>
                                  <p className="mt-0.5 text-xs font-normal text-muted-foreground">{result.email || "No email"}</p>
                                  <p className="mt-0.5 font-mono text-[10px] font-normal text-muted-foreground">
                                    {result.broker === "eo" ? "EO" : "IQ"} ID: {result.accountId || result.userId}
                                    {result.accountName ? ` · ${result.accountName}` : ""}
                                    {result.accountMode ? ` · ${result.accountMode}` : ""}
                                  </p>
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                <PlacementBadge status={result.status} />
                              </td>
                              <td className="py-3 pr-4">
                                <div className="space-y-1">
                                  <ResultBadge result={result.tradeResult} />
                                  {typeof result.profit === "number" ? (
                                    <p className={`text-xs font-semibold ${result.profit >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                                      {result.profit >= 0 ? "+" : ""}{formatCurrency(result.profit, result.currency)}
                                    </p>
                                  ) : null}
                                  {result.tradeId ? <p className="font-mono text-[10px] text-muted-foreground">Trade {result.tradeId}</p> : null}
                                </div>
                              </td>
                              <td className="py-3 pr-4 text-foreground">{typeof result.amount === "number" ? formatCurrency(result.amount, result.currency) : "—"}</td>
                              <td className="py-3 pr-4 text-foreground">{typeof result.martingaleStep === "number" ? `Step ${result.martingaleStep}` : "—"}</td>
                              <td className="py-3 text-muted-foreground">{result.reason ?? (result.status === "executed" ? "Waiting for broker result if pending" : "—")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {pages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(pages, page + 1))}
            disabled={page === pages}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
