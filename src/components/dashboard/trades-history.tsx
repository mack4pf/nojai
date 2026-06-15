"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetaTrader5Icon } from "@/components/icons/metatrader5-icon";
import { api, normalizeUserProfile } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency, formatSignedCurrency } from "@/lib/utils";
import type { UserProfile } from "@/types";

interface TradeItem {
  _id: string;
  accountEmail: string;
  tradeId: string;
  asset: string;
  direction: string;
  amount: number;
  expirationSecs: number;
  openTime: string;
  closeTime: string;
  result: string;
  profit: number;
  currency?: string | null;
  status: string;
  source: string;
  martingaleStep: number;
  broker?: "iq" | "eo" | "olymp" | "mt5";
  lot?: number;
  openPrice?: number;
  closePrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  pips?: number;
}

interface TradesResponse {
  trades: TradeItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

function normalizeTradeResult(result?: string) {
  const value = String(result ?? "pending").trim().toLowerCase();
  if (value === "won" || value === "win") return { label: "WON", variant: "success" as const, draw: false };
  if (value === "lost" || value === "loss") return { label: "LOST", variant: "warning" as const, draw: false };
  if (value === "tp") return { label: "TP", variant: "success" as const, draw: false };
  if (value === "sl") return { label: "SL", variant: "warning" as const, draw: false };
  if (value === "closed") return { label: "CLOSED", variant: "secondary" as const, draw: false };
  if (value === "draw") return { label: "DRAW", variant: "secondary" as const, draw: true };
  return { label: value ? value.toUpperCase() : "PENDING", variant: "secondary" as const, draw: false };
}

function normalizeTradeDirection(direction?: string) {
  const value = String(direction ?? "").trim().toLowerCase();
  if (value === "buy") return "buy";
  if (value === "sell") return "sell";
  return value === "call" ? "call" : value === "put" ? "put" : "call";
}

function BrokerBadge({ broker }: { broker?: "iq" | "eo" | "olymp" | "mt5" }) {
  if (broker === "mt5") {
    return (
      <span className="flex items-center gap-1.5 rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
        <span className="flex h-4 w-4 items-center justify-center rounded bg-white p-0.5">
          <MetaTrader5Icon className="h-full w-full" stroke="#011118" />
        </span>
        MT5
      </span>
    );
  }

  if (broker === "olymp") {
    return (
      <span className="flex items-center gap-1.5 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
        <Image
          src="/autobot-assets/olymptrade.jpeg"
          alt="Olymp"
          width={12}
          height={12}
          className="h-3 w-3 rounded-sm object-contain"
        />
        Olymp Trade
      </span>
    );
  }

  return (
    <span className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-bold ${
      broker === "eo" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"
    }`}>
      <Image
        src={broker === "eo" ? "/autobot-assets/experoptionlogo.png" : "/autobot-assets/iq-option-small.svg"}
        alt={broker === "eo" ? "EO" : "IQ"}
        width={12}
        height={12}
        className="h-3 w-3 object-contain"
      />
      {broker === "eo" ? "ExpertOption" : "IQ Option"}
    </span>
  );
}

export function TradesHistory() {
  const [page, setPage] = useState(1);
  const [brokerFilter, setBrokerFilter] = useState<"all" | "iq" | "eo" | "olymp" | "mt5">("all");
  const limit = 20;

  const { data: profile } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => normalizeUserProfile((await api.get("/user/profile")).data) as UserProfile | null,
  });

  const hasBinary = Boolean(profile?.subscription?.access?.binary);
  const hasForex = Boolean(profile?.subscription?.access?.forex);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.trades({ page, limit, broker: brokerFilter }),
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit };
      if (brokerFilter !== "all") params.broker = brokerFilter;
      const res = await api.get("/user/trades", { params });
      return res.data as TradesResponse;
    },
  });

  const trades = data?.trades ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Trades</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">View your trading history and results.</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="text-xs text-muted-foreground">Broker:</span>
        {(hasBinary && hasForex) && (
        <button
          onClick={() => { setBrokerFilter("all"); setPage(1); }}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors sm:px-3 ${
            brokerFilter === "all"
              ? "bg-primary text-primary-foreground"
              : "border border-white/10 text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        )}
        {hasBinary && (
        <button
          onClick={() => { setBrokerFilter("iq"); setPage(1); }}
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors sm:gap-1.5 sm:px-3 ${
            brokerFilter === "iq"
              ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30"
              : "border border-white/10 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Image src="/autobot-assets/iq-option-small.svg" alt="IQ" width={14} height={14} className="h-3 w-3 object-contain sm:h-3.5 sm:w-3.5" />
          <span className="sm:hidden">IQ</span>
          <span className="hidden sm:inline">IQ Option</span>
        </button>
        )}
        {hasBinary && (
        <button
          onClick={() => { setBrokerFilter("olymp"); setPage(1); }}
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors sm:gap-1.5 sm:px-3 ${
            brokerFilter === "olymp"
              ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"
              : "border border-white/10 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Image src="/autobot-assets/olymptrade.jpeg" alt="Olymp" width={14} height={14} className="h-3 w-3 rounded-sm object-contain sm:h-3.5 sm:w-3.5" />
          <span className="sm:hidden">Olymp</span>
          <span className="hidden sm:inline">Olymp Trade</span>
        </button>
        )}
        {hasBinary && (
        <button
          onClick={() => { setBrokerFilter("eo"); setPage(1); }}
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors sm:gap-1.5 sm:px-3 ${
            brokerFilter === "eo"
              ? "bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30"
              : "border border-white/10 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Image src="/autobot-assets/experoptionlogo.png" alt="EO" width={14} height={14} className="h-3 w-3 object-contain sm:h-3.5 sm:w-3.5" />
          <span className="sm:hidden">EO</span>
          <span className="hidden sm:inline">ExpertOption</span>
        </button>
        )}
        {hasForex && (
        <button
          onClick={() => { setBrokerFilter("mt5"); setPage(1); }}
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors sm:gap-1.5 sm:px-3 ${
            brokerFilter === "mt5"
              ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30"
              : "border border-white/10 text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded bg-white p-0.5 sm:h-4 sm:w-4">
            <MetaTrader5Icon className="h-full w-full" stroke="#011118" />
          </span>
          MT5
        </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-white/[0.06] py-12">
          <p className="text-sm text-muted-foreground">Loading trades...</p>
        </div>
      ) : trades.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <History className="mb-3 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No trades yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Trade history will appear here once the bot executes trades.</p>
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="space-y-2 sm:hidden">
            {trades.map((trade) => (
              <div key={trade._id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                {(() => {
                  const result = normalizeTradeResult(trade.result);
                  const direction = normalizeTradeDirection(trade.direction);
                  const profit = Number(trade.profit ?? 0);

                  return (
                    <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {direction === "call" || direction === "buy" ? (
                      <ArrowUp className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-red-400" />
                    )}
                    <span className="text-sm font-medium">{trade.asset}</span>
                    <BrokerBadge broker={trade.broker} />
                  </div>
                  <Badge variant={result.variant} className={`text-[10px] ${result.draw ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : ""}`}>
                    {result.label}
                  </Badge>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                  <div>
                    <p className="uppercase tracking-wider">Amount</p>
                    <p className="mt-0.5 font-medium text-foreground">{formatCurrency(trade.amount, trade.currency)}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wider">Profit</p>
                    <p className={`mt-0.5 font-medium ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatSignedCurrency(profit, trade.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wider">Step</p>
                    <p className="mt-0.5 font-medium text-foreground">{trade.broker === "mt5" ? trade.lot ?? "—" : trade.martingaleStep}</p>
                  </div>
                </div>
                {trade.broker === "mt5" ? (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                    <div>
                      <p className="uppercase tracking-wider">TP</p>
                      <p className="mt-0.5 font-medium text-foreground">{trade.takeProfit ?? "—"}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wider">SL</p>
                      <p className="mt-0.5 font-medium text-foreground">{trade.stopLoss ?? "—"}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wider">Pips</p>
                      <p className={`mt-0.5 font-medium ${
                        trade.pips == null ? "text-muted-foreground" :
                        trade.pips >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {trade.pips != null ? `${trade.pips >= 0 ? "+" : ""}${trade.pips.toFixed(1)}` : "—"}
                      </p>
                    </div>
                  </div>
                ) : null}
                <p className="mt-2 text-[10px] text-muted-foreground/60">
                  {new Date(trade.openTime).toLocaleString()}
                </p>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden overflow-x-auto rounded-2xl border border-white/[0.06] sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Broker</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Profit</th>
                  <th className="px-4 py-3">Pips</th>
                  <th className="px-4 py-3">Step</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => {
                  const result = normalizeTradeResult(trade.result);
                  const direction = normalizeTradeDirection(trade.direction);
                  const profit = Number(trade.profit ?? 0);

                  return (
                  <tr key={trade._id} className="border-b border-white/[0.03] last:border-0">
                    <td className="px-4 py-3 font-medium">{trade.asset}</td>
                    <td className="px-4 py-3">
                      <BrokerBadge broker={trade.broker} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 ${direction === "call" || direction === "buy" ? "text-emerald-400" : "text-red-400"}`}>
                        {direction === "call" || direction === "buy" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                        {direction.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">{trade.broker === "mt5" ? `${trade.lot ?? trade.amount} lot` : formatCurrency(trade.amount, trade.currency)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={result.variant} className={`text-[10px] ${result.draw ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : ""}`}>
                        {result.label}
                      </Badge>
                    </td>
                    <td className={`px-4 py-3 font-medium ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatSignedCurrency(profit, trade.currency)}
                    </td>
                    <td className={`px-4 py-3 font-medium ${
                      trade.broker !== "mt5" || trade.pips == null
                        ? "text-muted-foreground"
                        : trade.pips >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {trade.broker === "mt5" && trade.pips != null
                        ? `${trade.pips >= 0 ? "+" : ""}${trade.pips.toFixed(1)} pips`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {trade.broker === "mt5" ? (
                        <span className="text-xs text-muted-foreground">TP {trade.takeProfit ?? "—"} / SL {trade.stopLoss ?? "—"}</span>
                      ) : trade.martingaleStep}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(trade.openTime).toLocaleString()}</td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.pages} ({pagination.total} trades)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
