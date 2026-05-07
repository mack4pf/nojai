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
import {
  addMinutes,
  endOfDay,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";
import { Calendar, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency, formatSignedCurrency, normalizeCurrencyCode } from "@/lib/utils";

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

type PeriodPreset = "1D" | "7D" | "14D" | "30D" | "custom";
type ChartInterval = "300" | "120" | "60" | "30" | "15" | "5";

const PRESETS: { label: PeriodPreset; days: number | null }[] = [
  { label: "1D", days: 1 },
  { label: "7D", days: 7 },
  { label: "14D", days: 14 },
  { label: "30D", days: 30 },
  { label: "custom", days: null },
];

const INTERVALS: { label: string; minutes: ChartInterval }[] = [
  { label: "5m", minutes: "5" },
  { label: "15m", minutes: "15" },
  { label: "30m", minutes: "30" },
  { label: "1h", minutes: "60" },
  { label: "2h", minutes: "120" },
  { label: "5h", minutes: "300" },
];

const CUSTOM_INTERVALS: { label: string; minutes: ChartInterval }[] = [
  { label: "5m", minutes: "5" },
  { label: "15m", minutes: "15" },
  { label: "30m", minutes: "30" },
  { label: "1h", minutes: "60" },
  { label: "2h", minutes: "120" },
  { label: "5h", minutes: "300" },
];

interface ChartPoint {
  date: string;
  label: string;
  pnl: number;
  cumPnl: number;
  wins: number;
  losses: number;
}

interface DailyReturnsPoint {
  date: string;
  profit: number;
  cumulative: number;
  trades: number;
  won: number;
  lost: number;
}

interface CurrencySummary {
  totalProfit: number;
  totalLoss: number;
  totalWon: number;
  totalLost: number;
  netPnl: number;
  winRate: number;
}

interface DailyReturnsResponse {
  days: number;
  broker: string;
  data: DailyReturnsPoint[];
  byCurrency: Record<string, Array<{ date: string; profit: number; cumulative: number; won: number; lost: number }>>;
  summaryCurrency: Record<string, CurrencySummary>;
}

interface TradeHistoryItem {
  _id: string;
  accountEmail?: string;
  amount: number;
  profit?: number;
  result?: string;
  openTime?: string;
  closeTime?: string;
  currency?: string | null;
}

interface TradesResponse {
  trades: TradeHistoryItem[];
  pagination: { total: number };
}

interface BalanceHistoryPoint {
  date: string;
  balance: number;
  currency?: string | null;
  broker?: string;
  accountId?: string;
}

interface BalanceHistoryResponse {
  source: "snapshots" | "trades";
  data: BalanceHistoryPoint[];
}

function formatDateTimeInput(date: Date) {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function floorToInterval(date: Date, intervalMinutes: number) {
  const floored = new Date(date);
  floored.setSeconds(0, 0);
  floored.setMinutes(floored.getMinutes() - (floored.getMinutes() % intervalMinutes));
  return floored;
}

function getPointLabel(date: Date, isTimeRange: boolean) {
  return isTimeRange ? format(date, "MMM d, HH:mm") : format(date, "MMM d");
}

function getTradeNet(trade: TradeHistoryItem) {
  if (typeof trade.profit === "number") return trade.profit;
  return trade.result === "lost" ? -(trade.amount ?? 0) : 0;
}

// ─── Chart.js Canvas Component ────────────────────────────────────────────────

interface ProfitabilityCanvasProps {
  points: ChartPoint[];
  currency: string | null;
}

function ProfitabilityCanvas({ points, currency }: ProfitabilityCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [themeKey, setThemeKey] = useState("dark");

  useEffect(() => {
    const root = document.documentElement;
    const updateThemeKey = () => setThemeKey(root.classList.contains("light") ? "light" : "dark");
    updateThemeKey();
    const observer = new MutationObserver(updateThemeKey);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const labels = useMemo(() => points.map((p) => p.label), [points]);
  const values = useMemo(() => points.map((p) => p.cumPnl), [points]);
  const pnlValues = useMemo(() => points.map((p) => p.pnl), [points]);
  const winsValues = useMemo(() => points.map((p) => p.wins), [points]);
  const lossesValues = useMemo(() => points.map((p) => p.losses), [points]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const isLightTheme = document.documentElement.classList.contains("light");
    const axisColor = isLightTheme ? "rgba(15,23,42,0.62)" : "rgba(255,255,255,0.35)";
    const gridColor = isLightTheme ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.04)";
    const zeroLineColor = isLightTheme ? "rgba(15,23,42,0.24)" : "rgba(255,255,255,0.18)";
    const tooltipBg = isLightTheme ? "#ffffff" : "#0a0a12";
    const tooltipBorder = isLightTheme ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.08)";
    const tooltipTitle = isLightTheme ? "#0f172a" : "#ffffff";
    const tooltipBody = isLightTheme ? "rgba(15,23,42,0.72)" : "rgba(255,255,255,0.65)";

    // Destroy previous chart instance
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const n = values.length;
    const totalDuration = Math.min(2000, Math.max(800, n * 40));
    const delayBetweenPoints = n > 0 ? totalDuration / n : 40;

    // Progressive line animation — identical to chart.js sample
    const previousY = (ctx2: { index: number; chart: Chart; datasetIndex: number }) => {
      if (ctx2.index === 0) {
        return ctx2.chart.scales["y"]?.getPixelForValue(0) ?? 0;
      }
      const meta = ctx2.chart.getDatasetMeta(ctx2.datasetIndex);
      const prev = meta.data[ctx2.index - 1];
      if (!prev) return 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (prev as any).getProps(["y"], true).y as number;
    };

    const animation = {
      x: {
        type: "number" as const,
        easing: "linear" as const,
        duration: delayBetweenPoints,
        from: NaN,
        delay(ctx2: { type: string; xStarted?: boolean; index: number }) {
          if (ctx2.type !== "data" || ctx2.xStarted) return 0;
          ctx2.xStarted = true;
          return ctx2.index * delayBetweenPoints;
        },
      },
      y: {
        type: "number" as const,
        easing: "linear" as const,
        duration: delayBetweenPoints,
        from: previousY,
        delay(ctx2: { type: string; yStarted?: boolean; index: number }) {
          if (ctx2.type !== "data" || ctx2.yStarted) return 0;
          ctx2.yStarted = true;
          return ctx2.index * delayBetweenPoints;
        },
      },
    };

    // Gradient fill plugin — sets the background gradient after scales are laid out
    const gradientPlugin = {
      id: "gradientFill",
      afterLayout(chart: Chart) {
        const { chartArea, scales } = chart;
        if (!chartArea || !scales["y"]) return;

        const yScale = scales["y"];
        const zeroY = yScale.getPixelForValue(0);
        const top = chartArea.top;
        const bottom = chartArea.bottom;

        const zeroFrac = Math.max(0, Math.min(1, (zeroY - top) / (bottom - top)));

        const gradient = ctx.createLinearGradient(0, top, 0, bottom);
        gradient.addColorStop(0, "rgba(52,211,153,0.28)");
        gradient.addColorStop(Math.max(0, zeroFrac - 0.001), "rgba(52,211,153,0.04)");
        gradient.addColorStop(Math.min(1, zeroFrac + 0.001), "rgba(248,113,113,0.04)");
        gradient.addColorStop(1, "rgba(248,113,113,0.28)");

        chart.data.datasets[0].backgroundColor = gradient;
      },
    };

    // Zero baseline plugin — draws a horizontal line at y=0
    const zeroLinePlugin = {
      id: "zeroLine",
      afterDraw(chart: Chart) {
        const { ctx: c, chartArea, scales } = chart;
        if (!chartArea || !scales["y"]) return;
        const yScale = scales["y"];
        const zeroY = yScale.getPixelForValue(0);
        if (zeroY < chartArea.top || zeroY > chartArea.bottom) return;

        c.save();
        c.beginPath();
        c.moveTo(chartArea.left, zeroY);
        c.lineTo(chartArea.right, zeroY);
        c.lineWidth = 1;
        c.strokeStyle = zeroLineColor;
        c.setLineDash([4, 4]);
        c.stroke();
        c.restore();
      },
    };

    const options: ChartOptions<"line"> = {
      responsive: true,
      maintainAspectRatio: false,
      animations: animation as unknown as ChartOptions<"line">["animations"],
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          borderWidth: 1,
          titleColor: tooltipTitle,
          bodyColor: tooltipBody,
          padding: 12,
          cornerRadius: 12,
          displayColors: false,
          callbacks: {
            title(items: TooltipItem<"line">[]) {
              return items[0]?.label ?? "";
            },
            label(item: TooltipItem<"line">) {
              const idx = item.dataIndex;
              const cumPnl = values[idx] ?? 0;
              const cyclePnl = pnlValues[idx] ?? 0;
              const wins = winsValues[idx] ?? 0;
              const losses = lossesValues[idx] ?? 0;
              const fmt = (v: number) =>
                currency ? formatSignedCurrency(v, currency) : (v >= 0 ? "+" : "") + v.toFixed(2);
              return [
                `Running Total: ${fmt(cumPnl)}`,
                `Cycle P&L:     ${fmt(cyclePnl)}`,
                `Trades: ${wins + losses}  (${wins}W / ${losses}L)`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: axisColor,
            font: { size: 10 },
            maxTicksLimit: 8,
            maxRotation: 0,
          },
          grid: { display: false },
          border: { display: false },
        },
        y: {
          ticks: {
            color: axisColor,
            font: { size: 10 },
            callback(val) {
              const v = Number(val);
              return currency ? formatCurrency(v, currency) : v.toFixed(2);
            },
          },
          grid: {
            color: gridColor,
          },
          border: { display: false },
        },
      },
    };

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            data: values,
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.35,
            fill: "origin",
            backgroundColor: "transparent", // overridden by gradientPlugin.afterLayout
            // Segment-based line coloring: green when positive, red when negative
            segment: {
              borderColor: (segCtx) => {
                const y0 = segCtx.p0.parsed.y ?? 0;
                const y1 = segCtx.p1.parsed.y ?? 0;
                if (y0 >= 0 && y1 >= 0) return "#34d399";
                if (y0 < 0 && y1 < 0) return "#f87171";
                // Crossing zero — colour by direction
                return y1 >= y0 ? "#34d399" : "#f87171";
              },
            },
          },
        ],
      },
      options,
      plugins: [gradientPlugin, zeroLinePlugin],
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [labels, values, pnlValues, winsValues, lossesValues, currency, themeKey]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export interface BalanceChartProps {
  broker?: "iq" | "eo";
}

export function BalanceChart({ broker = "iq" }: BalanceChartProps) {
  const [period, setPeriod] = useState<PeriodPreset>("7D");
  const [dailyInterval, setDailyInterval] = useState<ChartInterval>("60");
  const [customInterval, setCustomInterval] = useState<ChartInterval>("60");
  const todayStr = formatDateTimeInput(new Date());
  const [customFrom, setCustomFrom] = useState(() => formatDateTimeInput(subDays(new Date(), 1)));
  const [customTo, setCustomTo] = useState(() => formatDateTimeInput(new Date()));
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);

  // Multi-day periods use the pre-aggregated /user/returns/daily endpoint (no pagination limit)
  const isMultiDay = period !== "1D" && period !== "custom";
  const periodDaysForQuery = period === "7D" ? 7 : period === "14D" ? 14 : 30;

  const queryKey = [
    ...queryKeys.balanceHistory(
      period === "custom"
        ? `custom:${customFrom}:${customTo}:${customInterval}`
        : period === "1D"
          ? `1D:${dailyInterval}`
          : period,
    ),
    broker,
  ];

  // ── Multi-day: daily-returns aggregation (all historical data, no limit) ───
  const { data: dailyReturnsData, isLoading: isDailyLoading } = useQuery({
    queryKey: ["daily-returns", broker, periodDaysForQuery],
    queryFn: async () => {
      try {
        const res = await api.get<DailyReturnsResponse>("/user/returns/daily", {
          params: { days: periodDaysForQuery, broker },
        });
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: isMultiDay,
    staleTime: 60_000,
  });

  // ── Intraday (1D / custom): fetch raw trades for time-bucket granularity ──
  // Also acts as fallback when dailyReturnsData fails to load for multi-day views
  const { data: tradesData, isLoading: isTradesLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        const params: Record<string, string | number> = { limit: 1000, page: 1 };
        params.broker = broker === "eo" ? "eo" : "iq";
        const res = await api.get<TradesResponse>("/user/trades", { params });
        return res.data;
      } catch {
        return { trades: [], pagination: { total: 0 } };
      }
    },
    enabled: !isMultiDay || dailyReturnsData === null,
    staleTime: 60_000,
  });

  const isLoading = isMultiDay ? isDailyLoading : isTradesLoading;

  const periodDays =
    period === "1D" ? 1 : period === "custom" ? 30 : (PRESETS.find((p) => p.label === period)?.days ?? 7);

  const { data: balanceHistory } = useQuery({
    queryKey: ["balance-history:snapshots", broker, periodDays],
    queryFn: async () => {
      try {
        const res = await api.get<BalanceHistoryResponse>("/user/balance-history", {
          params: { period: periodDays, broker },
        });
        return res.data;
      } catch {
        return { source: "trades", data: [] } as BalanceHistoryResponse;
      }
    },
    staleTime: 30_000,
  });

  // Determine available currencies and auto-select
  const availableCurrencies = useMemo(() => {
    if (isMultiDay && dailyReturnsData?.byCurrency) {
      return Object.keys(dailyReturnsData.byCurrency).sort();
    }
    if (!isMultiDay && tradesData?.trades) {
      return Array.from(
        new Set(tradesData.trades.map((t) => normalizeCurrencyCode(t.currency)).filter(Boolean)),
      ) as string[];
    }
    return [];
  }, [isMultiDay, dailyReturnsData, tradesData]);

  // Auto-select currency when available set changes
  useEffect(() => {
    setSelectedCurrency((prev) => {
      if (availableCurrencies.length === 0) return null;
      if (prev && availableCurrencies.includes(prev)) return prev;
      return availableCurrencies.includes("NGN") ? "NGN" : availableCurrencies[0];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableCurrencies.join(",")]);

  const { chartData, chartCurrency, totalPnl, roiPct, totalTrades, winRate, byCurrencyStats } =
    useMemo(() => {
      // ── Multi-day path: use pre-aggregated daily returns (no pagination limit) ──
      if (isMultiDay && dailyReturnsData) {
        const activeSeries =
          selectedCurrency && dailyReturnsData.byCurrency?.[selectedCurrency]
            ? dailyReturnsData.byCurrency[selectedCurrency]
            : dailyReturnsData.data;

        const cData: ChartPoint[] = activeSeries.map((p) => ({
          date: p.date,
          label: format(parseISO(p.date), "MMM d"),
          pnl: p.profit,
          cumPnl: p.cumulative,
          wins: p.won,
          losses: p.lost,
        }));

        const summary = selectedCurrency ? dailyReturnsData.summaryCurrency?.[selectedCurrency] : null;
        const allWon = summary?.totalWon ?? dailyReturnsData.data.reduce((s, p) => s + p.won, 0);
        const allLost = summary?.totalLost ?? dailyReturnsData.data.reduce((s, p) => s + p.lost, 0);
        const total = allWon + allLost;
        const cNetPnl = summary?.netPnl ?? (activeSeries.length > 0 ? activeSeries[activeSeries.length - 1].cumulative : 0);
        const cWinRate = summary?.winRate ?? (total > 0 ? Math.round((allWon / total) * 100) : 0);
        const cCurrency = selectedCurrency ?? null;

        return {
          chartData: cData,
          chartCurrency: cCurrency,
          totalPnl: cNetPnl,
          roiPct: null as number | null,
          totalTrades: total,
          winRate: cWinRate,
          totalInvested: 0,
          byCurrencyStats: dailyReturnsData.summaryCurrency ?? {},
        };
      }

      // ── Intraday path (1D / custom): raw trades ────────────────────────────
      const trades = tradesData?.trades ?? [];
      const snapshots = (
        balanceHistory?.source === "snapshots" ? balanceHistory.data : []
      ).filter((point) => point.balance !== undefined);

      let cutoff: Date;
      let endDate: Date;

      if (period === "custom") {
        cutoff = parseISO(customFrom);
        endDate = parseISO(customTo);
      } else if (period === "1D") {
        cutoff = startOfDay(new Date());
        endDate = endOfDay(new Date());
      } else {
        const days = PRESETS.find((p) => p.label === period)?.days ?? 7;
        cutoff = startOfDay(subDays(new Date(), days - 1));
        endDate = endOfDay(new Date());
      }

      const filtered = trades.filter((t) => {
        try {
          const ts = t.closeTime ?? t.openTime;
          if (!ts) return false;
          const d = parseISO(ts);
          return (
            (isAfter(d, cutoff) || d.getTime() === cutoff.getTime()) &&
            (isBefore(d, endDate) || d.getTime() === endDate.getTime())
          );
        } catch {
          return false;
        }
      });

      // ── Per-currency breakdown (intraday) ──────────────────────────────────
      const currencies = Array.from(
        new Set(filtered.map((t) => normalizeCurrencyCode(t.currency)).filter(Boolean)),
      ) as string[];
      const filteredByCurrency = selectedCurrency
        ? filtered.filter((t) => normalizeCurrencyCode(t.currency) === selectedCurrency)
        : filtered;
      const cCurrency = selectedCurrency ?? (currencies.length === 1 ? currencies[0] : null);

      const intradayByCurrencyStats: Record<string, CurrencySummary> = {};
      for (const cur of currencies) {
        const curTrades = filtered.filter((t) => normalizeCurrencyCode(t.currency) === cur);
        const cWon = curTrades.filter((t) => t.result === "won").length;
        const cLost = curTrades.filter((t) => t.result === "lost").length;
        const cTotal = cWon + cLost;
        const cGrossProfit = curTrades.reduce((s, t) => s + ((t.profit ?? 0) > 0 ? (t.profit ?? 0) : 0), 0);
        const cGrossLoss = curTrades.reduce((s, t) => s + ((t.profit ?? 0) < 0 ? Math.abs(t.profit ?? 0) : 0), 0);
        intradayByCurrencyStats[cur] = {
          totalProfit: Number(cGrossProfit.toFixed(2)),
          totalLoss: Number(cGrossLoss.toFixed(2)),
          totalWon: cWon,
          totalLost: cLost,
          netPnl: Number((cGrossProfit - cGrossLoss).toFixed(2)),
          winRate: cTotal > 0 ? Math.round((cWon / cTotal) * 100) : 0,
        };
      }

      const filteredSnapshots = snapshots
        .filter((point) => {
          try {
            const d = parseISO(point.date);
            return (
              (isAfter(d, cutoff) || d.getTime() === cutoff.getTime()) &&
              (isBefore(d, endDate) || d.getTime() === endDate.getTime())
            );
          } catch {
            return false;
          }
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      if (filteredSnapshots.length >= 2) {
        const firstBalance = filteredSnapshots[0]?.balance ?? 0;
        const lastBalance = filteredSnapshots[filteredSnapshots.length - 1]?.balance ?? firstBalance;
        const cData = filteredSnapshots.map((point) => {
          const balance = Number(point.balance.toFixed(2));
          const pnl = Number((balance - firstBalance).toFixed(2));
          const date = parseISO(point.date);
          return {
            date: point.date,
            label: getPointLabel(date, true),
            pnl,
            cumPnl: pnl,
            wins: 0,
            losses: 0,
          };
        });
        const snapCurrency = normalizeCurrencyCode(filteredSnapshots[0]?.currency) ?? cCurrency;
        const cTotalPnl = Number((lastBalance - firstBalance).toFixed(2));
        const wins = filteredByCurrency.filter((t) => t.result === "won").length;
        const total = filteredByCurrency.filter((t) => t.result === "won" || t.result === "lost").length;
        return {
          chartData: cData,
          chartCurrency: snapCurrency,
          totalPnl: cTotalPnl,
          roiPct: firstBalance > 0 ? (cTotalPnl / firstBalance) * 100 : 0,
          totalTrades: total,
          winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
          totalInvested: 0,
          byCurrencyStats: intradayByCurrencyStats,
        };
      }

      // ── Bucket (time-interval) chart ────────────────────────────────────────
      const isIntraday = period === "1D" || period === "custom";
      const intervalMinutes = period === "1D" ? Number(dailyInterval) : Number(customInterval);
      const bucketMap: Record<string, { bucketDate: Date; pnl: number; wins: number; losses: number }> =
        {};

      let cursor = isIntraday ? floorToInterval(cutoff, intervalMinutes) : startOfDay(cutoff);
      while (cursor <= endDate) {
        bucketMap[cursor.toISOString()] = { bucketDate: new Date(cursor), pnl: 0, wins: 0, losses: 0 };
        cursor = isIntraday ? addMinutes(cursor, intervalMinutes) : addMinutes(cursor, 1440);
      }

      // Group by account within the currency-filtered trades
      const tradesByAccount = new Map<string, TradeHistoryItem[]>();
      for (const trade of filteredByCurrency) {
        const account = trade.accountEmail ?? "default";
        tradesByAccount.set(account, [...(tradesByAccount.get(account) ?? []), trade]);
      }

      for (const accountTrades of tradesByAccount.values()) {
        accountTrades.sort((a, b) => {
          const aTime = new Date(a.closeTime ?? a.openTime ?? 0).getTime();
          const bTime = new Date(b.closeTime ?? b.openTime ?? 0).getTime();
          return aTime - bTime;
        });

        let cyclePnl = 0;
        let cycleWins = 0;
        let cycleLosses = 0;

        for (const trade of accountTrades) {
          cyclePnl += getTradeNet(trade);
          if (trade.result === "won") cycleWins += 1;
          else if (trade.result === "lost") cycleLosses += 1;

          if (trade.result !== "won") continue;

          try {
            const ts = trade.closeTime ?? trade.openTime;
            if (!ts) continue;
            const tradeDate = parseISO(ts);
            const bucketDate = isIntraday
              ? floorToInterval(tradeDate, intervalMinutes)
              : startOfDay(tradeDate);
            const key = bucketDate.toISOString();
            if (bucketMap[key] !== undefined) {
              bucketMap[key].pnl += cyclePnl;
              bucketMap[key].wins += cycleWins;
              bucketMap[key].losses += cycleLosses;
            }
          } catch {
            /* skip */
          }

          cyclePnl = 0;
          cycleWins = 0;
          cycleLosses = 0;
        }
      }

      let cum = 0;
      const cData: ChartPoint[] = Object.entries(bucketMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, val]) => {
          cum += val.pnl;
          return {
            date,
            label: getPointLabel(val.bucketDate, isIntraday),
            pnl: Number(val.pnl.toFixed(2)),
            cumPnl: Number(cum.toFixed(2)),
            wins: val.wins,
            losses: val.losses,
          };
        });

      const cTotalPnl = cum;
      const winsCount = filteredByCurrency.filter((t) => t.result === "won").length;
      const totalCount = filteredByCurrency.filter((t) => t.result === "won" || t.result === "lost").length;
      const winRateVal = totalCount > 0 ? Math.round((winsCount / totalCount) * 100) : 0;

      return {
        chartData: cData,
        chartCurrency: cCurrency,
        totalPnl: cTotalPnl,
        roiPct: null,
        totalTrades: totalCount,
        winRate: winRateVal,
        totalInvested: 0,
        byCurrencyStats: intradayByCurrencyStats,
      };
    }, [isMultiDay, dailyReturnsData, tradesData, balanceHistory, period, customFrom, customTo, customInterval, dailyInterval, selectedCurrency]);

  const isPositive = totalPnl >= 0;
  const brokerLabel = broker === "eo" ? "ExpertOption" : "IQ Option";
  const hasMultipleCurrencies = availableCurrencies.length > 1;

  return (
    <div className="dashboard-solid-panel rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-bold sm:text-lg">Profitability</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {brokerLabel} — recovery-cycle P&amp;L · green = profit · red = drawdown
          </p>
        </div>

        {/* Period + interval selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-0.5">
            {PRESETS.map(({ label }) => (
              <button
                key={label}
                onClick={() => setPeriod(label)}
                className={`rounded-[0.625rem] px-3 py-1.5 text-xs font-semibold transition-colors ${
                  period === label
                    ? "bg-white/[0.1] text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={label === "custom" ? "Custom date range" : undefined}
              >
                {label === "custom" ? <Calendar className="h-3.5 w-3.5" /> : label}
              </button>
            ))}
          </div>

          {period === "1D" && (
            <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-0.5">
              {INTERVALS.map(({ label, minutes }) => (
                <button
                  key={minutes}
                  onClick={() => setDailyInterval(minutes)}
                  className={`rounded-[0.625rem] px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    dailyInterval === minutes
                      ? "bg-white/[0.1] text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {period === "custom" && (
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                type="datetime-local"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                max={customTo}
                className="theme-date-input rounded-xl border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-xs text-foreground"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="datetime-local"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                min={customFrom}
                max={todayStr}
                className="theme-date-input rounded-xl border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-xs text-foreground"
              />
              <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-0.5">
                {CUSTOM_INTERVALS.map(({ label, minutes }) => (
                  <button
                    key={minutes}
                    onClick={() => setCustomInterval(minutes)}
                    className={`rounded-[0.625rem] px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      customInterval === minutes
                        ? "bg-white/[0.1] text-white"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Currency selector — shown when multiple currencies exist (IQ NGN + USD) */}
      {hasMultipleCurrencies && (
        <div className="mt-5 flex gap-2">
          {availableCurrencies.map((cur) => {
            const stats = byCurrencyStats[cur];
            const isSelected = selectedCurrency === cur;
            const isPos = (stats?.netPnl ?? 0) >= 0;
            const symbol = cur === "NGN" ? "₦" : "$";
            return (
              <button
                key={cur}
                onClick={() => setSelectedCurrency(cur)}
                className={`flex-1 rounded-2xl border p-3 text-left transition-all ${
                  isSelected
                    ? "border-white/[0.15] bg-white/[0.07]"
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {symbol} {cur} Net P&amp;L
                </p>
                <p
                  className={`mt-1.5 font-display text-lg font-bold ${
                    isPos ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {formatSignedCurrency(stats?.netPnl ?? 0, cur)}
                </p>
                <p className="mt-0.5 text-[9px] text-muted-foreground">
                  Win Rate:{" "}
                  <span className="text-foreground">{stats?.winRate ?? 0}%</span>
                  {" · "}
                  {(stats?.totalWon ?? 0) + (stats?.totalLost ?? 0)} trades
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Stats row */}
      <div className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${hasMultipleCurrencies ? "mt-3" : "mt-5"}`}>
        <div className="dashboard-solid-panel rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {selectedCurrency ? `${selectedCurrency === "NGN" ? "₦" : "$"} Net P&L` : "Cycle Net P&L"}
          </p>
          <p
            className={`mt-1.5 font-display text-xl font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}
          >
            {formatSignedCurrency(totalPnl, chartCurrency)}
          </p>
          {!hasMultipleCurrencies && (
            <p className="mt-0.5 text-[9px] text-muted-foreground/60">completed martingale cycles</p>
          )}
        </div>

        <div className="dashboard-solid-panel rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Growth/Loss
          </p>
          {roiPct === null ? (
            <p className="mt-1.5 font-display text-xl font-bold text-muted-foreground">—</p>
          ) : (
            <div className="mt-1.5 flex items-center gap-1.5">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-400" />
              )}
              <p
                className={`font-display text-xl font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}
              >
                {isPositive ? "+" : ""}
                {roiPct.toFixed(1)}%
              </p>
            </div>
          )}
          <p className="mt-0.5 text-[9px] text-muted-foreground/60">from starting balance</p>
        </div>

        <div className="dashboard-solid-panel rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Trades
          </p>
          <p className="mt-1.5 font-display text-xl font-bold">{totalTrades}</p>
        </div>

        <div className="dashboard-solid-panel rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Win Rate
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <p className="font-display text-xl font-bold">{winRate}%</p>
            <Badge variant={winRate >= 60 ? "success" : "warning"} className="text-[9px]">
              {winRate >= 60 ? "Good" : winRate >= 45 ? "Fair" : "Low"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative mt-6 h-56 sm:h-72">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading chart&hellip;
          </div>
        ) : totalTrades === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-semibold text-muted-foreground">No trades yet in this period</p>
            <p className="text-xs text-muted-foreground/60">
              P&amp;L will appear here once the bot starts trading
            </p>
          </div>
        ) : (
          <>
            {/* Legend */}
            <div className="absolute right-0 top-0 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block h-[2px] w-4 rounded-full bg-emerald-400" />
                profit
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-[2px] w-4 rounded-full bg-red-400" />
                drawdown
              </span>
            </div>
            <ProfitabilityCanvas points={chartData} currency={chartCurrency} />
          </>
        )}
      </div>
    </div>
  );
}
