"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency, formatSignedCurrency } from "@/lib/utils";

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
  if (value === "won" || value === "win") return { label: "WON", variant: "success" as const };
  if (value === "lost" || value === "loss") return { label: "LOST", variant: "warning" as const };
  return { label: value ? value.toUpperCase() : "PENDING", variant: "secondary" as const };
}

function normalizeTradeDirection(direction?: string) {
  const value = String(direction ?? "").trim().toLowerCase();
  return value === "call" ? "call" : value === "put" ? "put" : "call";
}

export function TradesHistory() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.trades({ page, limit }),
    queryFn: async () => {
      const res = await api.get("/user/trades", { params: { page, limit } });
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
                    {direction === "call" ? (
                      <ArrowUp className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-red-400" />
                    )}
                    <span className="text-sm font-medium">{trade.asset}</span>
                  </div>
                  <Badge variant={result.variant} className="text-[10px]">
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
                    <p className="mt-0.5 font-medium text-foreground">{trade.martingaleStep}</p>
                  </div>
                </div>
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
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Profit</th>
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
                      <span className={`flex items-center gap-1 ${direction === "call" ? "text-emerald-400" : "text-red-400"}`}>
                        {direction === "call" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                        {direction.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatCurrency(trade.amount, trade.currency)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={result.variant} className="text-[10px]">
                        {result.label}
                      </Badge>
                    </td>
                    <td className={`px-4 py-3 font-medium ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatSignedCurrency(profit, trade.currency)}
                    </td>
                    <td className="px-4 py-3">{trade.martingaleStep}</td>
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