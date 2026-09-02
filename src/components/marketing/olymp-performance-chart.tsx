"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Win rate</p>
          <p className="mt-2 font-display text-4xl font-black text-blue-300">{data ? `${data.overallWinRate}%` : "—"}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Trades executed</p>
          <p className="mt-2 font-display text-4xl font-black">{data ? data.totalTrades.toLocaleString() : "—"}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Wins · Losses</p>
          <p className="mt-2 font-display text-4xl font-black">
            <span className="text-emerald-400">{data ? data.totalWins : "—"}</span>
            <span className="mx-1 text-muted-foreground">·</span>
            <span className="text-red-400">{data ? data.totalLosses : "—"}</span>
          </p>
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Daily P&amp;L</p>
        {hasActivity ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v, "USD")} width={70} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<CustomTooltip />} />
              <Bar dataKey="netProfitUsd" radius={[6, 6, 6, 6]} maxBarSize={40}>
                {chartData.map((day, index) => (
                  <Cell key={index} fill={day.netProfitUsd >= 0 ? GREEN : RED} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-muted-foreground">
            No closed trades in the last 7 days yet
          </div>
        )}
      </div>
    </div>
  );
}
