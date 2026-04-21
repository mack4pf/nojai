"use client";

import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { format, parseISO, subDays, startOfDay, isAfter } from "date-fns";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency, formatSignedCurrency, normalizeCurrencyCode } from "@/lib/utils";

type Period = "1D" | "7D" | "14D" | "30D";

const PERIODS: { label: Period; days: number }[] = [
  { label: "1D", days: 1 },
  { label: "7D", days: 7 },
  { label: "14D", days: 14 },
  { label: "30D", days: 30 },
];

interface ChartPoint {
  date: string;
  label: string;
  pnl: number;
  cumPnl: number;
  wins: number;
  losses: number;
}

interface TradeHistoryItem {
  _id: string;
  amount: number;
  profit?: number;
  result?: string;
  openTime?: string;
  closeTime?: string;
  currency?: string | null;
}

interface TradesResponse {
  trades: TradeHistoryItem[];
  pagination: {
    total: number;
  };
}

// Custom tooltip
function CustomTooltip({ active, payload, label, currency }: { active?: boolean; payload?: Array<{ value: number; payload: ChartPoint }>; label?: string; currency?: string | null }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as ChartPoint;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a12] px-4 py-3 text-xs shadow-2xl">
      <p className="mb-2 font-semibold text-white">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">P&amp;L</span>
          <span className={d.pnl >= 0 ? "font-bold text-emerald-400" : "font-bold text-red-400"}>
            {formatSignedCurrency(d.pnl, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Cumulative</span>
          <span className={d.cumPnl >= 0 ? "font-bold text-emerald-400" : "font-bold text-red-400"}>
            {formatSignedCurrency(d.cumPnl, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Trades</span>
          <span className="text-white">{d.wins + d.losses} ({d.wins}W / {d.losses}L)</span>
        </div>
      </div>
    </div>
  );
}

export function BalanceChart() {
  const [period, setPeriod] = useState<Period>("7D");

  // Fetch all trades â€” use a high limit to get full period data
  const { data: tradesData, isLoading } = useQuery({
    queryKey: queryKeys.balanceHistory(period),
    queryFn: async () => {
      try {
        const res = await api.get<TradesResponse>("/user/trades", {
          params: { limit: 500, page: 1 },
        });
        return res.data;
      } catch {
        return { trades: [], pagination: { total: 0 } };
      }
    },
    staleTime: 60_000,
  });

  const { chartData, chartCurrency, totalPnl, pctChange, totalTrades, winRate } = useMemo(() => {
    const trades = tradesData?.trades ?? [];
    const days = PERIODS.find((p) => p.label === period)?.days ?? 7;
    const cutoff = startOfDay(subDays(new Date(), days - 1));

    // Filter trades within period
    const filtered = trades.filter((t) => {
      try {
        const timestamp = t.closeTime ?? t.openTime;
        if (!timestamp) return false;
        return isAfter(parseISO(timestamp), cutoff);
      } catch {
        return false;
      }
    });

    // Group by day
    const dayMap: Record<string, { pnl: number; wins: number; losses: number }> = {};

    // Pre-fill all days so chart has full x-axis
    for (let i = days - 1; i >= 0; i--) {
      const key = format(subDays(new Date(), i), "yyyy-MM-dd");
      dayMap[key] = { pnl: 0, wins: 0, losses: 0 };
    }

    for (const trade of filtered) {
      try {
        const timestamp = trade.closeTime ?? trade.openTime;
        if (!timestamp) continue;
        const key = format(parseISO(timestamp), "yyyy-MM-dd");
        if (dayMap[key] !== undefined) {
          dayMap[key].pnl += trade.profit ?? 0;
          if (trade.result === "won") dayMap[key].wins += 1;
          else if (trade.result === "lost") dayMap[key].losses += 1;
        }
      } catch {
        /* skip bad dates */
      }
    }

    let cum = 0;
    const chartData: ChartPoint[] = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, val]) => {
        cum += val.pnl;
        return {
          date,
          label: days === 1 ? format(parseISO(date), "HH:mm") : format(parseISO(date), days <= 14 ? "MMM d" : "MMM d"),
          pnl: Number(val.pnl.toFixed(2)),
          cumPnl: Number(cum.toFixed(2)),
          wins: val.wins,
          losses: val.losses,
        };
      });

    const totalPnl = cum;
    const firstPnl = chartData[0]?.cumPnl ?? 0;
    const pctChange = firstPnl !== 0 ? ((totalPnl - firstPnl) / Math.abs(firstPnl)) * 100 : 0;

    const wins = filtered.filter((t) => t.result === "won").length;
    const total = filtered.filter((t) => t.result === "won" || t.result === "lost").length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const currencies = Array.from(new Set(filtered.map((trade) => normalizeCurrencyCode(trade.currency)).filter(Boolean)));
    const chartCurrency = currencies.length === 1 ? currencies[0] : null;

    return { chartData, chartCurrency, totalPnl, pctChange, totalTrades: filtered.length, winRate };
  }, [tradesData, period]);

  const isPositive = totalPnl >= 0;
  const strokeColor = isPositive ? "#34d399" : "#f87171";
  const fillId = isPositive ? "greenFill" : "redFill";

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-bold sm:text-lg">Profitability</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Bot P&L tracked in real time from your trades</p>
        </div>
        {/* Period selector */}
        <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-0.5">
          {PERIODS.map(({ label }) => (
            <button
              key={label}
              onClick={() => setPeriod(label)}
              className={`rounded-[0.625rem] px-3 py-1.5 text-xs font-semibold transition-colors ${
                period === label
                  ? "bg-white/[0.1] text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total P&L</p>
          <p className={`mt-1.5 font-display text-xl font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {formatSignedCurrency(totalPnl, chartCurrency)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Return</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            {isPositive
              ? <TrendingUp className="h-4 w-4 text-emerald-400" />
              : <TrendingDown className="h-4 w-4 text-red-400" />}
            <p className={`font-display text-xl font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
              {isPositive ? "+" : ""}{pctChange.toFixed(1)}%
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Trades</p>
          <p className="mt-1.5 font-display text-xl font-bold">{totalTrades}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Win Rate</p>
          <div className="mt-1.5 flex items-center gap-2">
            <p className="font-display text-xl font-bold">{winRate}%</p>
            <Badge variant={winRate >= 60 ? "success" : winRate >= 45 ? "warning" : "warning"} className="text-[9px]">
              {winRate >= 60 ? "Good" : winRate >= 45 ? "Fair" : "Low"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-5 h-52 sm:h-64">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading chartâ€¦</div>
        ) : totalTrades === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-semibold text-muted-foreground">No trades yet in this period</p>
            <p className="text-xs text-muted-foreground/60">P&L will appear here once the bot starts trading</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="greenFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="redFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.35)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.35)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => chartCurrency ? formatCurrency(v, chartCurrency) : v.toFixed(2)}
              />
              <Tooltip content={<CustomTooltip currency={chartCurrency} />} />
              <Area
                type="monotone"
                dataKey="cumPnl"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${fillId})`}
                dot={false}
                activeDot={{ r: 5, fill: strokeColor, stroke: "rgba(0,0,0,0.5)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
