"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowDown, ArrowUp, ChevronDown, ChevronUp, Loader2, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetaTrader5Icon } from "@/components/icons/metatrader5-icon";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PopulatedUser {
  _id: string;
  email: string;
  fullName?: string;
}

interface Mt5Trade {
  _id: string;
  userId?: PopulatedUser | string;
  asset: string;
  direction: string;
  lot?: number;
  status: string;
  result?: string;
  openPrice?: number;
  closePrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  profit?: number;
  pips?: number;
  openTime: string;
  closeTime?: string;
  tradeId?: string;
  metaApiPositionId?: string;
  source?: string;
}

interface ExecutionJob {
  _id: string;
  userId?: PopulatedUser | string;
  action: string;
  symbol: string;
  calculatedLot: number;
  stopLoss?: number;
  takeProfit?: number;
  status: string;
  riskDecision: string;
  riskReason?: string;
  executionError?: string;
  retryCount: number;
  createdAt: string;
}

interface IncomingSignal {
  _id: string;
  source: string;
  action?: string;
  symbol?: string;
  stopLoss?: number;
  takeProfit?: number;
  takeProfits?: number[];
  orderId?: string;
  status: string;
  rejectReason?: string;
  receivedAt: string;
  rawPayload?: Record<string, unknown>;
  jobs: ExecutionJob[];
}

// ─── Status badge helpers ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "done" || status === "closed" || status === "dispatched"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "open" || status === "executing" || status === "approved" || status === "pending"
        ? "bg-blue-500/15 text-blue-300"
        : status === "dead_letter" || status === "failed" || status === "rejected"
          ? "bg-red-500/15 text-red-300"
          : "bg-white/[0.08] text-muted-foreground";

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type ActiveTab = "trades" | "signals";

// ─── MT5 Trades tab ───────────────────────────────────────────────────────────

function Mt5TradesTab() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-mt5-trades", page],
    queryFn: async () => {
      const res = await api.get("/admin/mt5/trades", { params: { page, limit } });
      return res.data as { trades: Mt5Trade[]; total: number; page: number; pages: number };
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
        Failed to load MT5 trades
      </div>
    );
  }

  const trades = data?.trades ?? [];

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
        <MetaTrader5Icon className="mb-3 h-8 w-8 text-muted-foreground/30" stroke="currentColor" />
        <p className="text-sm font-medium text-muted-foreground">No MT5 trades yet</p>
        <p className="mt-1 text-xs text-muted-foreground/60">Trades will appear here once the execution worker processes a signal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {trades.map((trade) => {
          const user = typeof trade.userId === "object" ? trade.userId : null;
          const isLong = /buy/i.test(trade.direction);
          const profit = Number(trade.profit ?? 0);
          return (
            <div key={trade._id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isLong ? <ArrowUp className="h-4 w-4 text-emerald-400" /> : <ArrowDown className="h-4 w-4 text-red-400" />}
                  <span className="text-sm font-semibold">{trade.asset}</span>
                  <StatusBadge status={trade.status} />
                </div>
                <span className={`text-xs font-medium ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {profit >= 0 ? "+" : ""}{profit.toFixed(2)}
                </span>
              </div>
              {user && (
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{user.email}</p>
              )}
              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                <div><p className="uppercase tracking-wider">Lot</p><p className="mt-0.5 font-medium text-foreground">{trade.lot ?? "—"}</p></div>
                <div><p className="uppercase tracking-wider">SL</p><p className="mt-0.5 font-medium text-foreground">{trade.stopLoss ?? "—"}</p></div>
                <div><p className="uppercase tracking-wider">TP</p><p className="mt-0.5 font-medium text-foreground">{trade.takeProfit ?? "—"}</p></div>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground/60">{new Date(trade.openTime).toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-white/[0.06] sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Direction</th>
              <th className="px-4 py-3">Lot</th>
              <th className="px-4 py-3">SL / TP</th>
              <th className="px-4 py-3">Profit</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Opened</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => {
              const user = typeof trade.userId === "object" ? trade.userId : null;
              const isLong = /buy/i.test(trade.direction);
              const profit = Number(trade.profit ?? 0);
              return (
                <tr key={trade._id} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02]">
                  <td className="max-w-[180px] truncate px-4 py-3 text-xs text-muted-foreground">
                    {user ? (
                      <div>
                        <p className="font-medium text-foreground">{user.fullName ?? user.email}</p>
                        {user.fullName && <p className="text-[10px]">{user.email}</p>}
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">{trade.asset}</td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 ${isLong ? "text-emerald-400" : "text-red-400"}`}>
                      {isLong ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                      {trade.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">{trade.lot ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    SL {trade.stopLoss ?? "—"} / TP {trade.takeProfit ?? "—"}
                  </td>
                  <td className={`px-4 py-3 font-medium ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {profit !== 0 ? `${profit >= 0 ? "+" : ""}${profit.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={trade.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(trade.openTime).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {data.page} of {data.pages} ({data.total} trades)</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Signals tab ──────────────────────────────────────────────────────────────

function Mt5SignalsTab() {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 15;

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-mt5-signals", page],
    queryFn: async () => {
      const res = await api.get("/admin/mt5/signals", { params: { page, limit } });
      return res.data as { signals: IncomingSignal[]; total: number; page: number; pages: number };
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
        Failed to load MT5 signals
      </div>
    );
  }

  const signals = data?.signals ?? [];

  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
        <Radio className="mb-3 h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">No signals received yet</p>
        <p className="mt-1 text-xs text-muted-foreground/60">Every webhook signal will appear here, including rejected ones.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {signals.map((signal) => {
          const isExpanded = expandedId === signal._id;
          const queued = signal.jobs.filter((j) => j.status !== "rejected").length;
          const failed = signal.jobs.filter((j) => j.status === "dead_letter" || j.status === "failed").length;
          const done = signal.jobs.filter((j) => j.status === "done").length;
          const jobTakeProfits = signal.jobs
            .map((job) => job.takeProfit)
            .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
          const takeProfits = Array.from(new Set([...(signal.takeProfits ?? []), ...jobTakeProfits, signal.takeProfit].filter(
            (value): value is number => typeof value === "number" && Number.isFinite(value),
          )));
          const stopLoss = signal.stopLoss ?? signal.jobs.find((job) => job.stopLoss != null)?.stopLoss;

          return (
            <div key={signal._id} className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <button
                className="flex w-full items-center justify-between p-3 text-left"
                onClick={() => setExpandedId(isExpanded ? null : signal._id)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-medium ${signal.action === "BUY" ? "text-emerald-400" : signal.action === "SELL" ? "text-red-400" : "text-foreground"}`}>
                    {signal.action ?? "—"} {signal.symbol ?? "—"}
                  </span>
                  <StatusBadge status={signal.status} />
                  <span className="text-xs text-muted-foreground">{signal.source.replace("_", " ")}</span>
                  {signal.jobs.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {done} done · {queued - done} queued · {failed} failed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-muted-foreground">{new Date(signal.receivedAt).toLocaleString()}</span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-white/[0.04] px-3 pb-3 pt-2 space-y-3">
                  {/* Signal details */}
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <div className="rounded-lg bg-white/[0.03] p-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">SL</p>
                      <p className="mt-0.5 font-medium">{stopLoss ?? "—"}</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] p-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">TP</p>
                      <p className="mt-0.5 font-medium">{takeProfits.length > 0 ? takeProfits.join(", ") : "—"}</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] p-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Order ID</p>
                      <p className="mt-0.5 truncate font-medium">{signal.orderId ?? "—"}</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] p-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Jobs</p>
                      <p className="mt-0.5 font-medium">{signal.jobs.length}</p>
                    </div>
                  </div>

                  {signal.rejectReason && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                      Rejected: {signal.rejectReason}
                    </div>
                  )}

                  {/* Execution jobs */}
                  {signal.jobs.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Execution jobs</p>
                      {signal.jobs.map((job) => {
                        const user = typeof job.userId === "object" ? job.userId : null;
                        return (
                          <div key={job._id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
                            <StatusBadge status={job.status} />
                            <span className="font-medium">{job.symbol}</span>
                            <span>{job.calculatedLot} lot</span>
                            <span className="text-muted-foreground">SL {job.stopLoss ?? stopLoss ?? "—"} / TP {job.takeProfit ?? "—"}</span>
                            {user && <span className="text-muted-foreground">{user.email}</span>}
                            {job.executionError && (
                              <span className="truncate text-red-400">{job.executionError}</span>
                            )}
                            {job.riskReason && job.status === "rejected" && (
                              <span className="text-amber-400">{job.riskReason}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {data.page} of {data.pages} ({data.total} signals)</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminMt5TradesManager() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("trades");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 p-1.5">
            <MetaTrader5Icon className="h-full w-full" stroke="#67e8f9" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">MT5 AutoTrade</p>
            <h2 className="text-lg font-bold">Trade History &amp; Signal Dispatch</h2>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          View all MT5 trades executed across every user account, and inspect every incoming webhook signal with its per-account execution jobs.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
        <button
          onClick={() => setActiveTab("trades")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "trades"
              ? "bg-white/[0.08] text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Executed Trades
        </button>
        <button
          onClick={() => setActiveTab("signals")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "signals"
              ? "bg-white/[0.08] text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Signal Dispatch Log
        </button>
      </div>

      {activeTab === "trades" ? <Mt5TradesTab /> : <Mt5SignalsTab />}
    </div>
  );
}
