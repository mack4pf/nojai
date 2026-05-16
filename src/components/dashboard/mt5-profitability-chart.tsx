"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip as ChartTooltip,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp } from "lucide-react";

import { api } from "@/lib/api";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  ChartTooltip,
  Legend,
);

type PeriodPreset = "1D" | "7D" | "14D" | "30D";
type ChartInterval = 1 | 2 | 4;
type ChartMode = "profit" | "pips";

interface DayPoint {
  date: string;
  label: string;
  profit: number;
  cumProfit: number;
  pips: number;
  cumPips: number;
  wins: number;
  losses: number;
}

interface ProfitabilityResponse {
  period: string;
  days?: number;
  intervalHours?: number;
  data: DayPoint[];
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

interface CanvasProps {
  points: DayPoint[];
  mode: ChartMode;
}

function ProfitCanvas({ points, mode }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [themeKey, setThemeKey] = useState("dark");

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setThemeKey(root.classList.contains("light") ? "light" : "dark");
    update();
    const obs = new MutationObserver(update);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const labels = useMemo(() => points.map((p) => p.label), [points]);
  const values = useMemo(() => points.map((p) => (mode === "profit" ? p.cumProfit : p.cumPips)), [points, mode]);
  const dailyValues = useMemo(() => points.map((p) => (mode === "profit" ? p.profit : p.pips)), [points, mode]);
  const winsValues = useMemo(() => points.map((p) => p.wins), [points]);
  const lossesValues = useMemo(() => points.map((p) => p.losses), [points]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isLight = document.documentElement.classList.contains("light");
    const axisColor = isLight ? "rgba(15,23,42,0.62)" : "rgba(255,255,255,0.35)";
    const gridColor = isLight ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.04)";
    const zeroLineColor = isLight ? "rgba(15,23,42,0.24)" : "rgba(255,255,255,0.18)";
    const tooltipBg = isLight ? "#ffffff" : "#0a0a12";
    const tooltipBorder = isLight ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.08)";
    const tooltipTitle = isLight ? "#0f172a" : "#ffffff";
    const tooltipBody = isLight ? "rgba(15,23,42,0.72)" : "rgba(255,255,255,0.65)";

    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const n = values.length;
    const totalDuration = Math.min(1800, Math.max(600, n * 35));
    const delay = n > 0 ? totalDuration / n : 35;

    const previousY = (ctx2: { index: number; chart: Chart; datasetIndex: number }) => {
      if (ctx2.index === 0) return ctx2.chart.scales["y"]?.getPixelForValue(0) ?? 0;
      const meta = ctx2.chart.getDatasetMeta(ctx2.datasetIndex);
      const prev = meta.data[ctx2.index - 1];
      if (!prev) return 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (prev as any).getProps(["y"], true).y as number;
    };

    const animation = {
      x: { type: "number" as const, easing: "linear" as const, duration: delay, from: NaN,
        delay(c: { type: string; xStarted?: boolean; index: number }) { if (c.type !== "data" || c.xStarted) return 0; c.xStarted = true; return c.index * delay; } },
      y: { type: "number" as const, easing: "linear" as const, duration: delay, from: previousY,
        delay(c: { type: string; yStarted?: boolean; index: number }) { if (c.type !== "data" || c.yStarted) return 0; c.yStarted = true; return c.index * delay; } },
    };

    const gradientPlugin = {
      id: "mt5GradientFill",
      afterLayout(chart: Chart) {
        const { chartArea, scales } = chart;
        if (!chartArea || !scales["y"]) return;
        const yScale = scales["y"];
        const zeroY = yScale.getPixelForValue(0);
        const top = chartArea.top; const bottom = chartArea.bottom;
        const zeroFrac = Math.max(0, Math.min(1, (zeroY - top) / (bottom - top)));
        const gradient = ctx.createLinearGradient(0, top, 0, bottom);
        gradient.addColorStop(0, "rgba(52,211,153,0.28)");
        gradient.addColorStop(Math.max(0, zeroFrac - 0.001), "rgba(52,211,153,0.04)");
        gradient.addColorStop(Math.min(1, zeroFrac + 0.001), "rgba(248,113,113,0.04)");
        gradient.addColorStop(1, "rgba(248,113,113,0.28)");
        chart.data.datasets[0].backgroundColor = gradient;
      },
    };

    const zeroLinePlugin = {
      id: "mt5ZeroLine",
      afterDraw(chart: Chart) {
        const { ctx: c, chartArea, scales } = chart;
        if (!chartArea || !scales["y"]) return;
        const yScale = scales["y"];
        const zeroY = yScale.getPixelForValue(0);
        if (zeroY < chartArea.top || zeroY > chartArea.bottom) return;
        c.save(); c.beginPath();
        c.moveTo(chartArea.left, zeroY); c.lineTo(chartArea.right, zeroY);
        c.lineWidth = 1; c.strokeStyle = zeroLineColor; c.setLineDash([4, 4]); c.stroke(); c.restore();
      },
    };

    const options: ChartOptions<"line"> = {
      responsive: true,
      maintainAspectRatio: false,
      animations: animation as unknown as ChartOptions<"line">["animations"],
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tooltipBg, borderColor: tooltipBorder, borderWidth: 1,
          titleColor: tooltipTitle, bodyColor: tooltipBody, padding: 12, cornerRadius: 12, displayColors: false,
          callbacks: {
            title(items: TooltipItem<"line">[]) { return items[0]?.label ?? ""; },
            label(item: TooltipItem<"line">) {
              const idx = item.dataIndex;
              const cum = values[idx] ?? 0;
              const daily = dailyValues[idx] ?? 0;
              const wins = winsValues[idx] ?? 0;
              const losses = lossesValues[idx] ?? 0;
              const fmt = (v: number) => mode === "profit"
                ? `${v >= 0 ? "+" : ""}$${v.toFixed(2)}`
                : `${v >= 0 ? "+" : ""}${v.toFixed(1)} pips`;
              return [
                `Cumulative: ${fmt(cum)}`,
                `This bucket: ${fmt(daily)}`,
                `Trades: ${wins + losses}  (${wins}W / ${losses}L)`,
              ];
            },
          },
        },
      },
      scales: {
        x: { ticks: { color: axisColor, font: { size: 10 }, maxTicksLimit: 7, maxRotation: 0 }, grid: { display: false }, border: { display: false } },
        y: {
          ticks: { color: axisColor, font: { size: 10 },
            callback(val) { const v = Number(val); return mode === "profit" ? `$${v.toFixed(0)}` : `${v.toFixed(0)}`; }},
          grid: { color: gridColor }, border: { display: false },
        },
      },
    };

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          data: values, borderWidth: 2, pointRadius: 0, tension: 0.35, fill: "origin",
          backgroundColor: "transparent",
          segment: {
            borderColor: (segCtx) => {
              const y0 = segCtx.p0.parsed.y ?? 0; const y1 = segCtx.p1.parsed.y ?? 0;
              if (y0 >= 0 && y1 >= 0) return "#34d399";
              if (y0 < 0 && y1 < 0) return "#f87171";
              return y1 >= y0 ? "#34d399" : "#f87171";
            },
          },
        }],
      },
      options,
      plugins: [gradientPlugin, zeroLinePlugin],
    });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labels, values, dailyValues, winsValues, lossesValues, mode, themeKey]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}

// ─── Main export ─────────────────────────────────────────────────────────────

interface Mt5ProfitabilityChartProps {
  totalPips?: number;
  pipsToday?: number;
  totalProfit?: number;
  profitToday?: number;
}

export function Mt5ProfitabilityChart({
  totalPips = 0,
  pipsToday = 0,
  totalProfit = 0,
  profitToday = 0,
}: Mt5ProfitabilityChartProps) {
  const [period, setPeriod] = useState<PeriodPreset>("14D");
  const [interval, setInterval] = useState<ChartInterval>(1);
  const [mode, setMode] = useState<ChartMode>("profit");

  const isIntraday = period === "1D";
  const days = period === "7D" ? 7 : period === "14D" ? 14 : 30;

  const { data, isLoading } = useQuery({
    queryKey: ["mt5-profitability", period, interval],
    queryFn: async () => {
      const params = isIntraday
        ? { period: "1D", intervalHours: interval }
        : { days };
      const res = await api.get<ProfitabilityResponse>("/mt5/profitability", { params });
      return res.data;
    },
    staleTime: isIntraday ? 30_000 : 60_000,
    refetchInterval: isIntraday ? 30_000 : 60_000,
  });

  const points = data?.data ?? [];

  const totalWins = points.reduce((s, p) => s + p.wins, 0);
  const totalLosses = points.reduce((s, p) => s + p.losses, 0);
  const totalTrades = totalWins + totalLosses;
  const winRate = totalTrades > 0 ? Math.round((totalWins / totalTrades) * 100) : 0;

  const finalCumProfit = points.length > 0 ? (points[points.length - 1]?.cumProfit ?? 0) : 0;
  const finalCumPips = points.length > 0 ? (points[points.length - 1]?.cumPips ?? 0) : 0;

  const displayValue = mode === "profit" ? finalCumProfit : finalCumPips;
  const isPositive = displayValue >= 0;

  return (
    <div className="space-y-3">

      {/* ── Top: two big hero stats side-by-side ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 sm:p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-300/60 sm:text-[10px]">Total Profit</p>
          <p className={`mt-1 text-lg font-bold leading-none sm:text-2xl ${totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}
          </p>
          <p className={`mt-1 text-[10px] sm:text-[11px] ${profitToday >= 0 ? "text-emerald-400/70" : "text-red-400/70"}`}>
            Today&nbsp;{profitToday >= 0 ? "+" : ""}${profitToday.toFixed(2)}
          </p>
        </div>

        <div className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.06] p-3 sm:p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-violet-300/60 sm:text-[10px]">Total Pips</p>
          <p className={`mt-1 text-lg font-bold leading-none sm:text-2xl ${totalPips >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {totalPips >= 0 ? "+" : ""}{totalPips.toFixed(1)}
          </p>
          <p className={`mt-1 text-[10px] sm:text-[11px] ${pipsToday >= 0 ? "text-emerald-400/70" : "text-red-400/70"}`}>
            Today&nbsp;{pipsToday >= 0 ? "+" : ""}{pipsToday.toFixed(1)}
          </p>
        </div>
      </div>

      {/* ── Bottom two small stats ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-3 sm:p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-300/60 sm:text-[10px]">Win Rate</p>
          <p className={`mt-1 text-lg font-bold leading-none sm:text-xl ${winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
            {winRate}%
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground sm:text-[11px]">{totalWins}W&nbsp;/&nbsp;{totalLosses}L</p>
        </div>

        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-3 sm:p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-300/60 sm:text-[10px]">Trades</p>
          <p className="mt-1 text-lg font-bold leading-none sm:text-xl">{totalTrades}</p>
          <p className="mt-1 text-[10px] text-muted-foreground sm:text-[11px]">
            {isIntraday ? "Last 24 h" : `Last ${days} days`}
          </p>
        </div>
      </div>

      {/* ── Chart card ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 sm:p-4">

        {/* Title + running total */}
        <div className="mb-3 flex items-center gap-2">
          {isPositive
            ? <TrendingUp className="h-4 w-4 shrink-0 text-emerald-400" />
            : <TrendingDown className="h-4 w-4 shrink-0 text-red-400" />}
          <span className="text-sm font-semibold">MT5 Profitability</span>
          <span className={`ml-auto text-sm font-bold tabular-nums ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {mode === "profit"
              ? `${isPositive ? "+" : ""}$${finalCumProfit.toFixed(2)}`
              : `${isPositive ? "+" : ""}${finalCumPips.toFixed(1)} pips`}
          </span>
        </div>

        {/* Controls — stacked on mobile, row on sm+ */}
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

          {/* Period + interval (left group) */}
          <div className="flex items-center gap-2">
            {/* Period */}
            <div className="flex flex-1 rounded-full border border-white/[0.08] bg-white/[0.04] p-0.5 text-[11px] sm:flex-none">
              {(["1D", "7D", "14D", "30D"] as PeriodPreset[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`flex-1 rounded-full px-2 py-1 font-semibold transition-colors sm:flex-none sm:px-2.5 ${
                    period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Interval — only visible for 1D */}
            {isIntraday && (
              <div className="flex rounded-full border border-white/[0.08] bg-white/[0.04] p-0.5 text-[11px]">
                {([1, 2, 4] as ChartInterval[]).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setInterval(h)}
                    className={`rounded-full px-2.5 py-1 font-semibold transition-colors ${
                      interval === h ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mode toggle (right) */}
          <div className="flex rounded-full border border-white/[0.08] bg-white/[0.04] p-0.5 text-[11px] self-start sm:self-auto">
            {(["profit", "pips"] as ChartMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1 font-semibold capitalize transition-colors ${
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Chart area — taller on mobile so it breathes */}
        <div className="relative h-[180px] sm:h-[220px]">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : points.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">No MT5 trades in this period</p>
            </div>
          ) : (
            <ProfitCanvas points={points} mode={mode} />
          )}
        </div>
      </div>
    </div>
  );
}
