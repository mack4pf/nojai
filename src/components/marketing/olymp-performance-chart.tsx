"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency } from "@/lib/utils";

interface OlympDailyPerformance {
  date: string;
  label: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netProfitUsd: number;
}

interface OlympPerformanceSnapshot {
  asOf: string;
  periodDays: number;
  overallWinRate: number;
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  netProfitUsd: number;
  days: OlympDailyPerformance[];
}

const GREEN = "#22c55e";
const RED = "#ef4444";
const LINE_BLUE = "#60a5fa";

function useRelativeTime(iso?: string) {
  const [, forceTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceTick((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  if (!iso) return "";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

function ColoredDot(props: any) {
  const { cx, cy, payload, index } = props;
  if (typeof cx !== "number" || typeof cy !== "number") return <g key={index} />;
  const color = payload.netProfitUsd >= 0 ? GREEN : RED;
  return <circle key={index} cx={cx} cy={cy} r={5} fill={color} stroke="#0a0f16" strokeWidth={2} />;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const day: OlympDailyPerformance = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0f16]/95 px-4 py-3 text-xs shadow-xl">
      <p className="font-semibold text-foreground">{day.label}</p>
      <p className={`mt-1 font-display text-lg font-bold ${day.netProfitUsd >= 0 ? "text-emerald-400" : "text-red-400"}`}>
        {formatCurrency(day.netProfitUsd, "USD")}
      </p>
      <p className="mt-1 text-muted-foreground">{day.wins}W · {day.losses}L{day.trades > 0 ? ` · ${day.winRate}% win rate` : ""}</p>
    </div>
  );
}

export function OlympPerformanceChart() {
  const { data } = useQuery<OlympPerformanceSnapshot>({
    queryKey: queryKeys.olympPerformance,
    queryFn: async () => (await api.get("/olymp-performance")).data,
    refetchInterval: 30_000,
  });

  const relativeTime = useRelativeTime(data?.asOf);
  const chartData = data?.days ?? [];
  const hasActivity = (data?.totalTrades ?? 0) > 0;
  const netProfit = data?.netProfitUsd ?? 0;

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Live platform performance</span>
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Real Olymp Trade results, last 7 days</h2>
        </div>
        {relativeTime ? <span className="text-xs text-muted-foreground">Updated {relativeTime}</span> : null}
      </div>

      <div className="mt-6 flex flex-col items-start gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/[0.05] p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Win rate — last 7 days</p>
          <p className="mt-1 font-display text-5xl font-black text-blue-300 sm:text-6xl">{data ? `${data.overallWinRate}%` : "—"}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Based on {data ? data.totalTrades.toLocaleString() : "—"} real closed trades this week
        </p>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Weekly profit / loss</p>
          {data ? (
            <span className={`font-display text-sm font-bold ${netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {netProfit >= 0 ? "+" : ""}{formatCurrency(netProfit, "USD")} net
            </span>
          ) : null}
        </div>
        {hasActivity ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v, "USD")} width={70} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="netProfitUsd"
                stroke={LINE_BLUE}
                strokeWidth={2.5}
                dot={(props: any) => <ColoredDot {...props} />}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-muted-foreground">
            No closed trades in the last 7 days yet
          </div>
        )}
      </div>
    </div>
  );
}
