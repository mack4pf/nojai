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
  userId: string;
  email: string;
  status: "executed" | "skipped" | "failed";
  reason?: string;
  amount?: number;
  currency?: string;
  martingaleStep?: number;
}

interface SignalLog {
  _id: string;
  dispatchId?: string;
  ticker: string;
  direction: "buy" | "sell";
  expirationSecs: number;
  botTarget: "pro" | "vip" | "mixed";
  botTargets?: Array<"pro" | "vip">;
  source: "tradingview" | "webhook" | "admin_manual" | "mixed";
  sources?: Array<"tradingview" | "webhook" | "admin_manual">;
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

export function AdminSignalsManager() {
  const [page, setPage] = useState(1);
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);
  const [botFilter, setBotFilter] = useState<"all" | "pro" | "vip">("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: [QUERY_KEY, page, botFilter],
    queryFn: async () => {
      const res = await api.get<SignalsResponse>("/admin/signals", {
        params: { page, limit: 10, botTarget: botFilter === "all" ? undefined : botFilter },
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
      return summary;
    },
    { targeted: 0, executed: 0, failed: 0, skipped: 0 },
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
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Skipped</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground">{pageSummary.skipped}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["all", "pro", "vip"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  setBotFilter(filter);
                  setPage(1);
                }}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
                  botFilter === filter
                    ? "bg-white/[0.1] text-foreground"
                    : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                }`}
              >
                {filter} targets
              </button>
            ))}
          </div>

          <div className="w-full max-w-sm">
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
                          <Badge key={`${signal._id}-${target}`} variant="secondary" className="bg-white/[0.08] text-muted-foreground">
                            {target}
                          </Badge>
                        ))}
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
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Step {'>'} 0</p>
                          <p className="mt-1 text-sm font-semibold text-foreground">{martingalePlacements}</p>
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
                      <table className="w-full min-w-[720px] text-sm">
                        <thead>
                          <tr className="border-b border-white/[0.06] text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            <th className="pb-3 pr-4">Account</th>
                            <th className="pb-3 pr-4">Status</th>
                            <th className="pb-3 pr-4">Amount</th>
                            <th className="pb-3 pr-4">Martingale</th>
                            <th className="pb-3">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {signal.results.map((result) => (
                            <tr key={`${signal._id}-${result.userId}-${result.status}`}>
                              <td className="py-3 pr-4 font-medium text-foreground">{result.email}</td>
                              <td className="py-3 pr-4">
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${result.status === "executed" ? "bg-emerald-500/15 text-emerald-300" : result.status === "failed" ? "bg-red-500/15 text-red-300" : "bg-white/[0.08] text-muted-foreground"}`}>
                                  {result.status}
                                </span>
                              </td>
                              <td className="py-3 pr-4 text-foreground">{typeof result.amount === "number" ? formatCurrency(result.amount, result.currency) : "—"}</td>
                              <td className="py-3 pr-4 text-foreground">{typeof result.martingaleStep === "number" ? `Step ${result.martingaleStep}` : "—"}</td>
                              <td className="py-3 text-muted-foreground">{result.reason ?? (result.status === "executed" ? "Trade placed successfully" : "—")}</td>
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
