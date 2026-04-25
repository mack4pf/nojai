"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  RefreshCw,
  Wallet,
  Zap,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";

interface RevenueDataPoint {
  time: string;
  date: string;
  value: number;
  secondary: number;
  vip: number;
  pro: number;
  standard: number;
}

interface AnalyticsDataPoint {
  time: string;
  date: string;
  value: number;
  secondary: number;
}

interface AnalyticsResponse {
  profitabilityData: AnalyticsDataPoint[];
  revenueData: RevenueDataPoint[];
  revenueNGN: RevenueDataPoint[];
  revenueUSD: RevenueDataPoint[];
  tradesData: AnalyticsDataPoint[];
  summary: {
    totalWon: number;
    totalLost: number;
    totalBuys: number;
    totalSells: number;
    totalTradeProfit: number;
    totalTradeLoss: number;
    winRate: number;
    signals: { vipSignals: number; proSignals: number; totalExecuted: number; totalFailed: number; totalSkipped: number; buySignals: number; sellSignals: number };
    revenue: { ngnTotal: number; usdTotal: number; total: number };
  };
}

const TOOLTIP_STYLE = {
  backgroundColor: "rgba(10, 15, 22, 0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  color: "#fff",
  padding: "10px 14px",
};

const GREEN = "#10b981";
const BLUE = "#3b82f6";
const RED = "#ef4444";
const AMBER = "#f59e0b";
const PIE_COLORS = [GREEN, BLUE, RED, AMBER, "#8b5cf6", "#ec4899"];

export function AdminAnalytics() {
  const [timeframe, setTimeframe] = useState<"1H" | "1D" | "1W" | "1M" | "ALL">("1W");
  const [chartType, setChartType] = useState<"line" | "bar" | "pie">("line");
  const [revenueCurrency, setRevenueCurrency] = useState<"ALL" | "NGN" | "USD">("ALL");

  const { data, isLoading, refetch, isRefetching } = useQuery<AnalyticsResponse>({
    queryKey: ["admin-analytics", timeframe],
    queryFn: async () => (await api.get("/admin/analytics", { params: { timeframe } })).data,
  });

  const profitabilityData = data?.profitabilityData || [];
  const tradesData = data?.tradesData || [];
  const summary = data?.summary;

  const activeRevenueData =
    revenueCurrency === "NGN" ? (data?.revenueNGN || [])
    : revenueCurrency === "USD" ? (data?.revenueUSD || [])
    : (data?.revenueData || []);

  const currencySymbol = revenueCurrency === "NGN" ? "₦" : "$";

  // ── Shared chart renderer ──
  function renderChart(
    chartData: any[],
    key1: string,
    key2: string,
    label1: string,
    label2: string,
    isCurrency = false,
    color1 = GREEN,
    color2 = BLUE,
  ) {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-muted-foreground">
          No data for this timeframe yet
        </div>
      );
    }

    const fmtTick = (v: number) => (isCurrency ? `${currencySymbol}${v}` : String(v));
    const fmtTooltip = (v: any) => (isCurrency ? `${currencySymbol}${Number(v).toLocaleString()}` : v);

    if (chartType === "pie") {
      const t1 = chartData.reduce((a, c) => a + (c[key1] ?? 0), 0);
      const t2 = chartData.reduce((a, c) => a + (c[key2] ?? 0), 0);
      const slices = [
        { name: label1, value: t1 },
        { name: label2, value: t2 },
      ].filter((s) => s.value > 0);

      if (slices.length === 0) slices.push({ name: "No data", value: 1 });

      return (
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie data={slices} cx="50%" cy="50%" innerRadius={75} outerRadius={115} paddingAngle={4} dataKey="value" strokeWidth={0}>
              {slices.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={fmtTooltip} contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barGap={2} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="time" stroke="rgba(255,255,255,0.25)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.25)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmtTick} width={55} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtTooltip} />
            <Legend wrapperStyle={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }} />
            <Bar dataKey={key1} name={label1} fill={color1} radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey={key2} name={label2} fill={color2} radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // Default: Line chart with area fill
    return (
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${key1}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color1} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color1} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`grad-${key2}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color2} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color2} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="time" stroke="rgba(255,255,255,0.25)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="rgba(255,255,255,0.25)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmtTick} width={55} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtTooltip} />
          <Legend wrapperStyle={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }} />
          <Area type="monotone" dataKey={key1} name={label1} stroke={color1} strokeWidth={2.5} fill={`url(#grad-${key1})`} dot={{ r: 3, fill: color1, strokeWidth: 0 }} activeDot={{ r: 5 }} />
          <Area type="monotone" dataKey={key2} name={label2} stroke={color2} strokeWidth={2.5} fill={`url(#grad-${key2})`} dot={{ r: 3, fill: color2, strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <section className="glass-panel relative overflow-hidden rounded-[32px] p-6 sm:p-8">
        <div className="surface-grid absolute inset-0 opacity-15" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="border-emerald-500/20 bg-emerald-500/15 text-emerald-300">Live Database</Badge>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">Platform Analytics</h1>
            <p className="text-sm text-muted-foreground">Real-time profitability, revenue, and trade data.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Chart type */}
            <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.03] p-1">
              {([
                { id: "line", icon: LineChartIcon, tip: "Line" },
                { id: "bar", icon: BarChart3, tip: "Bar" },
                { id: "pie", icon: PieChartIcon, tip: "Pie" },
              ] as const).map((t) => (
                <button key={t.id} onClick={() => setChartType(t.id)} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${chartType === t.id ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <t.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.tip}</span>
                </button>
              ))}
            </div>

            {/* Timeframe */}
            <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.03] p-1">
              {(["1H", "1D", "1W", "1M", "ALL"] as const).map((tf) => (
                <button key={tf} onClick={() => setTimeframe(tf)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${timeframe === tf ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {tf}
                </button>
              ))}
            </div>

            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading || isRefetching} className="rounded-2xl">
              {isLoading || isRefetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Tabs ── */}
      <Tabs defaultValue="profitability" className="space-y-6">
        <TabsList className="glass-panel flex h-auto flex-wrap items-center justify-start gap-2 rounded-2xl border-white/10 bg-white/[0.03] p-2">
          <TabsTrigger value="profitability" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white/10"><Activity className="mr-2 h-4 w-4" />Profitability</TabsTrigger>
          <TabsTrigger value="revenue" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white/10"><Wallet className="mr-2 h-4 w-4" />Revenue</TabsTrigger>
          <TabsTrigger value="trades" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white/10"><Zap className="mr-2 h-4 w-4" />Trades & Signals</TabsTrigger>
        </TabsList>

        {/* ── Profitability ── */}
        <TabsContent value="profitability" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Total Profit</p>
              <p className="mt-3 font-display text-4xl font-bold text-foreground">{formatCurrency(summary?.totalTradeProfit ?? 0)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Win Rate</p>
              <p className="mt-3 font-display text-4xl font-bold text-emerald-400">{summary?.winRate ?? 0}%</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Total Loss</p>
              <p className="mt-3 font-display text-4xl font-bold text-red-400">{formatCurrency(summary?.totalTradeLoss ?? 0)}</p>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-4 font-display text-xl font-bold">Profit Over Time</h2>
            {renderChart(profitabilityData, "value", "secondary", "All Users Profit", "Admin Profit", true)}
          </div>
        </TabsContent>

        {/* ── Revenue ── */}
        <TabsContent value="revenue" className="space-y-6">
          {/* Currency toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-muted-foreground">Currency:</p>
            <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.03] p-1">
              {(["ALL", "NGN", "USD"] as const).map((c) => (
                <button key={c} onClick={() => setRevenueCurrency(c)} className={`rounded-xl px-5 py-2 text-sm font-semibold transition-colors ${revenueCurrency === c ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {c === "ALL" ? "All" : c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">NGN Revenue</p>
              <p className="mt-3 font-display text-3xl font-bold text-foreground">₦{(summary?.revenue.ngnTotal ?? 0).toLocaleString()}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">USD Revenue</p>
              <p className="mt-3 font-display text-3xl font-bold text-foreground">${(summary?.revenue.usdTotal ?? 0).toLocaleString()}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Combined</p>
              <p className="mt-3 font-display text-3xl font-bold text-foreground">{formatCurrency(summary?.revenue.total ?? 0)}</p>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-4 font-display text-xl font-bold">Revenue — {revenueCurrency === "ALL" ? "All Currencies" : revenueCurrency}</h2>
            {renderChart(activeRevenueData, "vip", "pro", "VIP Plans", "PRO Plans", true, GREEN, BLUE)}
          </div>
        </TabsContent>

        {/* ── Trades & Signals ── */}
        <TabsContent value="trades" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Won</p>
              <p className="mt-3 font-display text-4xl font-bold text-emerald-400">{summary?.totalWon ?? 0}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Lost</p>
              <p className="mt-3 font-display text-4xl font-bold text-red-400">{summary?.totalLost ?? 0}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Buys (Call)</p>
              <p className="mt-3 font-display text-4xl font-bold text-foreground">{summary?.totalBuys ?? 0}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Sells (Put)</p>
              <p className="mt-3 font-display text-4xl font-bold text-foreground">{summary?.totalSells ?? 0}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">VIP Signals</p>
              <p className="mt-3 font-display text-3xl font-bold text-foreground">{summary?.signals.vipSignals ?? 0}</p>
              <p className="mt-1 text-sm text-muted-foreground">{summary?.signals.buySignals ?? 0} buy · {summary?.signals.sellSignals ?? 0} sell</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">PRO Signals</p>
              <p className="mt-3 font-display text-3xl font-bold text-foreground">{summary?.signals.proSignals ?? 0}</p>
              <p className="mt-1 text-sm text-muted-foreground">{summary?.signals.totalExecuted ?? 0} executed · {summary?.signals.totalFailed ?? 0} failed</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Delivery</p>
              <p className="mt-3 font-display text-3xl font-bold text-foreground">{summary?.signals.totalExecuted ?? 0}</p>
              <p className="mt-1 text-sm text-muted-foreground">{summary?.signals.totalSkipped ?? 0} skipped</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-4 font-display text-xl font-bold">Win vs Loss Over Time</h2>
            {renderChart(tradesData, "value", "secondary", "Won", "Lost", false, GREEN, RED)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
