"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface RevenueDataPoint {
  time: string;
  date: string;
  value: number;
  secondary: number;
  vip: number;
  pro: number;
  standard: number;
}

interface ChartPoint {
  time: string;
  date: string;
  value: number;
  loss?: number;
  secondary?: number;
}

interface BrokerCurrencySummary {
  currency: string;
  accountType?: 'REAL' | 'PRACTICE';
  totalProfit: number;
  totalLoss: number;
  netProfit?: number;
  totalWon: number;
  totalLost: number;
  winRate: number;
}

interface BalanceSummaryItem {
  totalBalance: number;
  accountCount: number;
}

interface AnalyticsResponse {
  profitabilityData: ChartPoint[];
  normalProfit?: {
    timeframe: string;
    currentFrom: string;
    currentTo: string;
    previousFrom: string;
    previousTo: string;
    items: Array<{
      broker: "iq" | "eo" | "olymp";
      currency: string;
      currentProfit: number;
      previousProfit: number;
      difference: number;
      currentTrades: number;
      previousTrades: number;
      isGrowth: boolean;
    }>;
  };
  revenueData: RevenueDataPoint[];
  revenueNGN: RevenueDataPoint[];
  revenueUSD: RevenueDataPoint[];
  tradesData: ChartPoint[];
  summary: {
    totalWon: number;
    totalLost: number;
    totalBuys: number;
    totalSells: number;
    totalTradeProfit: number;
    totalTradeLoss: number;
    winRate: number;
    signals: {
      vipSignals: number;
      proSignals: number;
      totalExecuted: number;
      totalFailed: number;
      totalSkipped: number;
      buySignals: number;
      sellSignals: number;
    };
    revenue: { ngnTotal: number; usdTotal: number; total: number };
  };
  iqData: {
    profitabilityNGN: ChartPoint[];
    profitabilityUSD: ChartPoint[];
    tradesData: ChartPoint[];
    summary: {
      byCurrency: BrokerCurrencySummary[];
      balances?: { NGN?: BalanceSummaryItem; USD?: BalanceSummaryItem };
    };
  };
  eoData: {
    profitabilityUSD: ChartPoint[];
    tradesData: ChartPoint[];
    summary: BrokerCurrencySummary & { balances?: { USD?: BalanceSummaryItem } };
  };
  olympData: {
    profitabilityUSD: ChartPoint[];
    tradesData: ChartPoint[];
    summary: BrokerCurrencySummary & { balances?: { USD?: BalanceSummaryItem } };
  };
}

const GREEN = "#10b981";
const BLUE = "#3b82f6";
const RED = "#ef4444";
const AMBER = "#f59e0b";
const PIE_COLORS = [GREEN, BLUE, RED, AMBER, "#8b5cf6", "#ec4899"];

function fmtNum(n: number, symbol: string) {
  if (Math.abs(n) >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${symbol}${(n / 1_000).toFixed(1)}K`;
  return `${symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function cSym(currency: string) {
  return currency === "NGN" ? "₦" : "$";
}

function RenderChart({
  chartData, key1, key2, label1, label2,
  symbol = "$", isCurrency = false, color1 = GREEN, color2 = BLUE, chartType,
}: {
  chartData: any[]; key1: string; key2: string; label1: string; label2: string;
  symbol?: string; isCurrency?: boolean; color1?: string; color2?: string;
  chartType: "line" | "bar" | "pie";
}) {
  const [isLightTheme, setIsLightTheme] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const updateTheme = () => setIsLightTheme(root.classList.contains("light"));
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const axisColor = isLightTheme ? "rgba(15,23,42,0.68)" : "rgba(255,255,255,0.35)";
  const gridColor = isLightTheme ? "rgba(15,23,42,0.10)" : "rgba(255,255,255,0.06)";
  const legendColor = isLightTheme ? "rgba(15,23,42,0.74)" : "rgba(255,255,255,0.65)";
  const tooltipStyle = {
    backgroundColor: isLightTheme ? "#ffffff" : "rgba(10, 15, 22, 0.95)",
    border: isLightTheme ? "1px solid rgba(15,23,42,0.14)" : "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    color: isLightTheme ? "#0f172a" : "#fff",
    padding: "10px 14px",
    boxShadow: isLightTheme ? "0 18px 40px rgba(15,23,42,0.14)" : "0 18px 40px rgba(0,0,0,0.35)",
  };

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-muted-foreground">
        No data for this timeframe yet
      </div>
    );
  }
  const fmtTick = (v: number) => (isCurrency ? fmtNum(v, symbol) : String(v));
  const fmtTip = (v: any) => (isCurrency ? `${symbol}${Number(v).toLocaleString()}` : v);

  if (chartType === "pie") {
    const t1 = chartData.reduce((a: number, c: any) => a + (c[key1] ?? 0), 0);
    const t2 = chartData.reduce((a: number, c: any) => a + (c[key2] ?? 0), 0);
    const slices = [{ name: label1, value: t1 }, { name: label2, value: t2 }].filter(s => s.value > 0);
    if (!slices.length) slices.push({ name: "No data", value: 1 });
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={slices} cx="50%" cy="50%" innerRadius={75} outerRadius={115} paddingAngle={4} dataKey="value" strokeWidth={0}>
            {slices.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={fmtTip} contentStyle={tooltipStyle} itemStyle={{ color: legendColor }} labelStyle={{ color: isLightTheme ? "#0f172a" : "#fff" }} />
          <Legend wrapperStyle={{ color: legendColor, fontSize: 13 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "bar") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barGap={2} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="time" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} tick={{ fill: axisColor }} />
          <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmtTick} width={60} tick={{ fill: axisColor }} />
          <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: legendColor }} labelStyle={{ color: isLightTheme ? "#0f172a" : "#fff" }} formatter={fmtTip} />
          <Legend wrapperStyle={{ color: legendColor, fontSize: 13 }} />
          <Bar dataKey={key1} name={label1} fill={color1} radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey={key2} name={label2} fill={color2} radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const g1 = `grad-${key1}-${color1.replace("#","")}`;
  const g2 = `grad-${key2}-${color2.replace("#","")}`;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id={g1} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color1} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color1} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={g2} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color2} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color2} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis dataKey="time" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} tick={{ fill: axisColor }} />
        <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmtTick} width={60} tick={{ fill: axisColor }} />
        <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: legendColor }} labelStyle={{ color: isLightTheme ? "#0f172a" : "#fff" }} formatter={fmtTip} />
        <Legend wrapperStyle={{ color: legendColor, fontSize: 13 }} />
        <Area type="monotone" dataKey={key1} name={label1} stroke={color1} strokeWidth={2.5} fill={`url(#${g1})`} dot={{ r: 3, fill: color1, strokeWidth: 0 }} activeDot={{ r: 5 }} />
        <Area type="monotone" dataKey={key2} name={label2} stroke={color2} strokeWidth={2.5} fill={`url(#${g2})`} dot={{ r: 3, fill: color2, strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className={`mt-2 font-display text-3xl font-bold ${color ?? "text-foreground"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function NormalProfitPanel({ data }: { data?: AnalyticsResponse["normalProfit"] }) {
  if (!data) return null;
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Normal Profit Difference</p>
          <h2 className="mt-1 font-display text-xl font-bold">Current {data.timeframe} minus previous {data.timeframe}</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDate(data.currentFrom, "MMM d HH:mm")} - {formatDate(data.currentTo, "MMM d HH:mm")}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {data.items.map((item) => {
          const symbol = cSym(item.currency);
          return (
            <div key={`${item.broker}-${item.currency}`} className={`rounded-2xl border p-4 ${item.isGrowth ? "border-emerald-500/20 bg-emerald-500/[0.05]" : "border-red-500/20 bg-red-500/[0.05]"}`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {item.broker === "eo" ? "ExpertOption" : item.broker === "olymp" ? "Olymp Trade" : "IQ Option"} · {item.currency}
              </p>
              <p className={`mt-2 font-display text-2xl font-bold ${item.isGrowth ? "text-emerald-300" : "text-red-300"}`}>
                {item.difference >= 0 ? "+" : ""}{symbol}{Math.abs(item.difference).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Now {symbol}{item.currentProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })} · Previous {symbol}{item.previousProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">{item.currentTrades} trades now · {item.previousTrades} before</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BrokerSwitch({ value, onChange }: { value: "iq" | "eo" | "olymp"; onChange: (v: "iq" | "eo" | "olymp") => void }) {
  return (
    <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.03] p-1">
      <button
        onClick={() => onChange("iq")}
        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${value === "iq" ? "bg-blue-500/20 text-blue-300" : "text-muted-foreground hover:text-foreground"}`}
      >
        <img src="/autobot-assets/iq-option-small.svg" alt="IQ" className="h-3.5 w-3.5 object-contain" />
        IQ Option
      </button>
      <button
        onClick={() => onChange("eo")}
        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${value === "eo" ? "bg-purple-500/20 text-purple-300" : "text-muted-foreground hover:text-foreground"}`}
      >
        <img src="/autobot-assets/experoptionlogo.png" alt="EO" className="h-3.5 w-3.5 object-contain" />
        ExpertOption
      </button>
      <button
        onClick={() => onChange("olymp")}
        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${value === "olymp" ? "bg-emerald-500/20 text-emerald-300" : "text-muted-foreground hover:text-foreground"}`}
      >
        <Image src="/autobot-assets/olymptrade.jpeg" alt="Olymp" width={14} height={14} className="h-3.5 w-3.5 rounded-sm object-contain" />
        Olymp Trade
      </button>
    </div>
  );
}

export function AdminAnalytics() {
  const [timeframe, setTimeframe] = useState<"1H" | "1D" | "1W" | "1M" | "ALL">("1W");
  const [chartType, setChartType] = useState<"line" | "bar" | "pie">("line");
  const [revenueCurrency, setRevenueCurrency] = useState<"ALL" | "NGN" | "USD">("ALL");
  const [broker, setBroker] = useState<"iq" | "eo" | "olymp">("iq");
  const [iqCurrency, setIqCurrency] = useState<"NGN" | "USD">("NGN");
  const [iqAccountType, setIqAccountType] = useState<"REAL" | "PRACTICE">("REAL");

  const { data, isLoading, refetch, isRefetching } = useQuery<AnalyticsResponse>({
    queryKey: ["admin-analytics", timeframe],
    queryFn: async () => (await api.get("/admin/analytics", { params: { timeframe } })).data,
  });

  const summary = data?.summary;
  const iqData = data?.iqData;
  const eoData = data?.eoData;
  const olympData = data?.olympData;

  const activeRevenueData =
    revenueCurrency === "NGN" ? (data?.revenueNGN ?? [])
    : revenueCurrency === "USD" ? (data?.revenueUSD ?? [])
    : (data?.revenueData ?? []);

  const iqProfitChart = iqCurrency === "NGN" ? (iqData?.profitabilityNGN ?? []) : (iqData?.profitabilityUSD ?? []);
  const iqSym = cSym(iqCurrency);

  // Aggregate NGN totals (all account types)
  const iqNGNItems = (iqData?.summary.byCurrency ?? []).filter(c => c.currency === "NGN");
  const iqNGN = iqNGNItems.length > 0 ? {
    totalProfit: iqNGNItems.reduce((s, c) => s + c.totalProfit, 0),
    totalLoss: iqNGNItems.reduce((s, c) => s + c.totalLoss, 0),
    totalWon: iqNGNItems.reduce((s, c) => s + c.totalWon, 0),
    totalLost: iqNGNItems.reduce((s, c) => s + c.totalLost, 0),
    winRate: 0,
  } : null;
  if (iqNGN) {
    const t = iqNGN.totalWon + iqNGN.totalLost;
    iqNGN.winRate = t > 0 ? Math.round((iqNGN.totalWon / t) * 100) : 0;
  }

  // USD split by REAL / PRACTICE
  const iqUSDItems = (iqData?.summary.byCurrency ?? []).filter(c => c.currency !== "NGN");
  const iqUSDReal = iqUSDItems.find(c => c.accountType === "REAL") ?? null;
  const iqUSDPractice = iqUSDItems.find(c => c.accountType === "PRACTICE") ?? null;
  const iqUSD = iqUSDItems.length > 0 ? {
    totalProfit: iqUSDItems.reduce((s, c) => s + c.totalProfit, 0),
    totalLoss: iqUSDItems.reduce((s, c) => s + c.totalLoss, 0),
    totalWon: iqUSDItems.reduce((s, c) => s + c.totalWon, 0),
    totalLost: iqUSDItems.reduce((s, c) => s + c.totalLost, 0),
    winRate: 0,
  } : null;
  if (iqUSD) {
    const t = iqUSD.totalWon + iqUSD.totalLost;
    iqUSD.winRate = t > 0 ? Math.round((iqUSD.totalWon / t) * 100) : 0;
  }

  const iqCurrSummary = iqCurrency === "NGN" ? iqNGN : iqUSD;
  const iqNetFromGross = (iqCurrSummary?.totalProfit ?? 0) - (iqCurrSummary?.totalLoss ?? 0);
  const iqCurrentBalance = iqCurrency === "NGN"
    ? (iqData?.summary.balances?.NGN?.totalBalance ?? 0)
    : (iqData?.summary.balances?.USD?.totalBalance ?? 0);
  const iqCurrentAccounts = iqCurrency === "NGN"
    ? (iqData?.summary.balances?.NGN?.accountCount ?? 0)
    : (iqData?.summary.balances?.USD?.accountCount ?? 0);
  const eoCurrentBalance = eoData?.summary.balances?.USD?.totalBalance ?? 0;
  const eoCurrentAccounts = eoData?.summary.balances?.USD?.accountCount ?? 0;
  const eoNetFromGross = (eoData?.summary.totalProfit ?? 0) - (eoData?.summary.totalLoss ?? 0);
  const olympCurrentBalance = olympData?.summary.balances?.USD?.totalBalance ?? 0;
  const olympCurrentAccounts = olympData?.summary.balances?.USD?.accountCount ?? 0;
  const olympNetFromGross = (olympData?.summary.totalProfit ?? 0) - (olympData?.summary.totalLoss ?? 0);

  return (
    <div className="space-y-6">
      <section className="glass-panel relative overflow-hidden rounded-[32px] p-6 sm:p-8">
        <div className="surface-grid absolute inset-0 opacity-15" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="border-emerald-500/20 bg-emerald-500/15 text-emerald-300">Live Database</Badge>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">Platform Analytics</h1>
            <p className="text-sm text-muted-foreground">Profitability, revenue, and trade data.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.03] p-1">
              {([{ id: "line" as const, icon: LineChartIcon, tip: "Line" }, { id: "bar" as const, icon: BarChart3, tip: "Bar" }, { id: "pie" as const, icon: PieChartIcon, tip: "Pie" }]).map(t => (
                <button key={t.id} onClick={() => setChartType(t.id)} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${chartType === t.id ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <t.icon className="h-4 w-4" /><span className="hidden sm:inline">{t.tip}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.03] p-1">
              {(["1H", "1D", "1W", "1M", "ALL"] as const).map(tf => (
                <button key={tf} onClick={() => setTimeframe(tf)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${timeframe === tf ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>{tf}</button>
              ))}
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading || isRefetching} className="rounded-2xl">
              {isLoading || isRefetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </section>

      <Tabs defaultValue="profitability" className="space-y-6">
        <TabsList className="glass-panel flex h-auto flex-wrap items-center justify-start gap-2 rounded-2xl border-white/10 bg-white/[0.03] p-2">
          <TabsTrigger value="profitability" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white/10"><Activity className="mr-2 h-4 w-4" />Profitability</TabsTrigger>
          <TabsTrigger value="revenue" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white/10"><Wallet className="mr-2 h-4 w-4" />Revenue</TabsTrigger>
          <TabsTrigger value="trades" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white/10"><Zap className="mr-2 h-4 w-4" />Trades &amp; Signals</TabsTrigger>
        </TabsList>

        {/* ── Profitability ── */}
        <TabsContent value="profitability" className="space-y-5">
          <NormalProfitPanel data={data?.normalProfit} />

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-muted-foreground">Broker:</span>
            <BrokerSwitch value={broker} onChange={setBroker} />
          </div>

          {broker === "iq" && (
            <>
              {/* NGN / USD summary cards — clickable to switch chart currency */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  onClick={() => setIqCurrency("NGN")}
                  className={`rounded-3xl border p-5 text-left transition-colors ${iqCurrency === "NGN" ? "border-amber-400/40 bg-amber-500/[0.07]" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/80">NGN · Naira</span>
                    {iqCurrency === "NGN" && <span className="ml-auto h-2 w-2 rounded-full bg-amber-400" />}
                  </div>
                  <p className={`mt-2 font-display text-3xl font-bold ${((iqNGN?.totalProfit ?? 0) - (iqNGN?.totalLoss ?? 0)) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    ₦{((iqNGN?.totalProfit ?? 0) - (iqNGN?.totalLoss ?? 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-emerald-400">{iqNGN?.winRate ?? 0}% win</span>
                    <span>{iqNGN?.totalWon ?? 0}W · {iqNGN?.totalLost ?? 0}L</span>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Gross ₦{(iqNGN?.totalProfit ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} - Loss ₦{(iqNGN?.totalLoss ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </button>

                {/* USD card — total + REAL/PRACTICE breakdown */}
                <button
                  onClick={() => setIqCurrency("USD")}
                  className={`rounded-3xl border p-5 text-left transition-colors ${iqCurrency === "USD" ? "border-blue-400/40 bg-blue-500/[0.07]" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-400/80">USD · Dollar</span>
                    {iqCurrency === "USD" && <span className="ml-auto h-2 w-2 rounded-full bg-blue-400" />}
                  </div>
                  <p className={`mt-2 font-display text-3xl font-bold ${((iqUSD?.totalProfit ?? 0) - (iqUSD?.totalLoss ?? 0)) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    ${((iqUSD?.totalProfit ?? 0) - (iqUSD?.totalLoss ?? 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-emerald-400">{iqUSD?.winRate ?? 0}% win</span>
                    <span>{iqUSD?.totalWon ?? 0}W · {iqUSD?.totalLost ?? 0}L</span>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Gross ${(iqUSD?.totalProfit ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} - Loss ${(iqUSD?.totalLoss ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                  {/* REAL vs PRACTICE sub-breakdown */}
                  {(iqUSDReal || iqUSDPractice) && (
                    <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3">
                      {iqUSDReal && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span className="text-muted-foreground">REAL</span>
                          </span>
                          <span className={`font-semibold ${(iqUSDReal.totalProfit - iqUSDReal.totalLoss) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            ${(iqUSDReal.totalProfit - iqUSDReal.totalLoss).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-muted-foreground">{iqUSDReal.winRate}% · {iqUSDReal.totalWon}W/{iqUSDReal.totalLost}L</span>
                        </div>
                      )}
                      {iqUSDPractice && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                            <span className="text-muted-foreground">PRACTICE</span>
                          </span>
                          <span className={`font-semibold ${(iqUSDPractice.totalProfit - iqUSDPractice.totalLoss) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            ${(iqUSDPractice.totalProfit - iqUSDPractice.totalLoss).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-muted-foreground">{iqUSDPractice.winRate}% · {iqUSDPractice.totalWon}W/{iqUSDPractice.totalLost}L</span>
                        </div>
                      )}
                    </div>
                  )}
                </button>

                <StatCard
                  label={`Net Profit · ${iqCurrency}`}
                  value={`${iqNetFromGross >= 0 ? "" : "-"}${iqSym}${Math.abs(iqNetFromGross).toLocaleString(undefined, { maximumFractionDigits: iqCurrency === "NGN" ? 0 : 2 })}`}
                  sub={`Gross ${iqSym}${(iqCurrSummary?.totalProfit ?? 0).toLocaleString(undefined, { maximumFractionDigits: iqCurrency === "NGN" ? 0 : 2 })} - loss ${iqSym}${(iqCurrSummary?.totalLoss ?? 0).toLocaleString(undefined, { maximumFractionDigits: iqCurrency === "NGN" ? 0 : 2 })}`}
                  color={iqNetFromGross >= 0 ? "text-emerald-400" : "text-red-400"}
                />
                <StatCard label={`Current Balance · ${iqCurrency}`} value={`${iqSym}${iqCurrentBalance.toLocaleString(undefined, { maximumFractionDigits: iqCurrency === "NGN" ? 0 : 2 })}`} sub={`${iqCurrentAccounts} connected account${iqCurrentAccounts === 1 ? "" : "s"}`} color="text-foreground" />
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-bold">
                    IQ Option Profit Over Time
                    <span className={`ml-2 text-sm font-semibold ${iqCurrency === "NGN" ? "text-amber-400" : "text-blue-400"}`}>({iqCurrency})</span>
                  </h2>
                  <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03] p-0.5">
                    {(["NGN", "USD"] as const).map(c => (
                      <button key={c} onClick={() => setIqCurrency(c)} className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${iqCurrency === c ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        {c === "NGN" ? "₦ NGN" : "$ USD"}
                      </button>
                    ))}
                  </div>
                </div>
                <RenderChart chartData={iqProfitChart} key1="value" key2="loss" label1={`Net Profit (${iqCurrency})`} label2={`Gross Loss (${iqCurrency})`} symbol={iqSym} isCurrency color1={GREEN} color2={RED} chartType={chartType} />
              </div>
            </>
          )}

          {broker === "eo" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Net Profit · USD</p>
                  <p className={`mt-2 font-display text-3xl font-bold ${eoNetFromGross >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {eoNetFromGross >= 0 ? "" : "-"}${Math.abs(eoNetFromGross).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Gross ${(eoData?.summary.totalProfit ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} - Loss ${(eoData?.summary.totalLoss ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <StatCard label="Win Rate" value={`${eoData?.summary.winRate ?? 0}%`} color="text-emerald-400" sub={`${eoData?.summary.totalWon ?? 0} won · ${eoData?.summary.totalLost ?? 0} lost`} />
                <StatCard label="Current Balance · USD" value={`$${eoCurrentBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} sub={`${eoCurrentAccounts} connected account${eoCurrentAccounts === 1 ? "" : "s"}`} />
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-bold">ExpertOption Profit Over Time <span className="text-sm font-semibold text-purple-400">(USD)</span></h2>
                  <img src="/autobot-assets/experoptionlogo.png" alt="EO" className="h-5 w-5 object-contain opacity-70" />
                </div>
                <RenderChart chartData={eoData?.profitabilityUSD ?? []} key1="value" key2="loss" label1="Net Profit (USD)" label2="Gross Loss (USD)" symbol="$" isCurrency color1={GREEN} color2={RED} chartType={chartType} />
              </div>
            </>
          )}

          {broker === "olymp" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Net Profit · USD</p>
                  <p className={`mt-2 font-display text-3xl font-bold ${olympNetFromGross >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {olympNetFromGross >= 0 ? "" : "-"}${Math.abs(olympNetFromGross).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Gross ${(olympData?.summary.totalProfit ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} - Loss ${(olympData?.summary.totalLoss ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <StatCard label="Win Rate" value={`${olympData?.summary.winRate ?? 0}%`} color="text-emerald-400" sub={`${olympData?.summary.totalWon ?? 0} won · ${olympData?.summary.totalLost ?? 0} lost`} />
                <StatCard label="Current Balance · USD" value={`$${olympCurrentBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} sub={`${olympCurrentAccounts} connected account${olympCurrentAccounts === 1 ? "" : "s"}`} />
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-bold">Olymp Trade Profit Over Time <span className="text-sm font-semibold text-emerald-400">(USD)</span></h2>
                  <Image src="/autobot-assets/olymptrade.jpeg" alt="Olymp" width={20} height={20} className="h-5 w-5 rounded-sm object-contain opacity-80" />
                </div>
                <RenderChart chartData={olympData?.profitabilityUSD ?? []} key1="value" key2="loss" label1="Net Profit (USD)" label2="Gross Loss (USD)" symbol="$" isCurrency color1={GREEN} color2={RED} chartType={chartType} />
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Revenue ── */}
        <TabsContent value="revenue" className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-muted-foreground">Currency:</span>
            <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.03] p-1">
              {(["ALL", "NGN", "USD"] as const).map(c => (
                <button key={c} onClick={() => setRevenueCurrency(c)} className={`rounded-xl px-5 py-2 text-sm font-semibold transition-colors ${revenueCurrency === c ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {c === "ALL" ? "All" : c === "NGN" ? "₦ NGN" : "$ USD"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">NGN Revenue</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground">₦{(summary?.revenue.ngnTotal ?? 0).toLocaleString()}</p>
              <p className="mt-1 text-xs text-muted-foreground">Paystack payments</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">USD Revenue</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground">${(summary?.revenue.usdTotal ?? 0).toLocaleString()}</p>
              <p className="mt-1 text-xs text-muted-foreground">Crypto payments</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Combined</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground">
                ₦{(summary?.revenue.ngnTotal ?? 0).toLocaleString()} + ${(summary?.revenue.usdTotal ?? 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-4 font-display text-xl font-bold">
              Revenue — {revenueCurrency === "ALL" ? "All Currencies" : revenueCurrency === "NGN" ? "₦ NGN" : "$ USD"}
            </h2>
            <RenderChart chartData={activeRevenueData} key1="vip" key2="pro" label1="VIP Plans" label2="PRO Plans" symbol={revenueCurrency === "NGN" ? "₦" : "$"} isCurrency color1={GREEN} color2={BLUE} chartType={chartType} />
          </div>
        </TabsContent>

        {/* ── Trades & Signals ── */}
        <TabsContent value="trades" className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-muted-foreground">Broker:</span>
            <BrokerSwitch value={broker} onChange={setBroker} />
          </div>

          {broker === "iq" ? (
            <>
              {/* REAL / PRACTICE tab switcher */}
              {(() => {
                const hasReal = (iqData?.summary.byCurrency ?? []).some(c => c.accountType === "REAL");
                const hasPractice = (iqData?.summary.byCurrency ?? []).some(c => c.accountType === "PRACTICE");
                const showTabs = hasReal && hasPractice;
                const filtered = (iqData?.summary.byCurrency ?? []).filter(c =>
                  !showTabs || c.accountType === iqAccountType
                );
                return (
                  <>
                    {showTabs && (
                      <div className="flex gap-2">
                        {(["REAL", "PRACTICE"] as const).map(t => (
                          <button
                            key={t}
                            onClick={() => setIqAccountType(t)}
                            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                              iqAccountType === t
                                ? t === "REAL"
                                  ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-400/40"
                                  : "bg-amber-500/20 text-amber-400 ring-1 ring-amber-400/40"
                                : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
                      {filtered.map((c, i) => (
                        <StatCard key={`w-${i}`} label={`Won · ${c.currency}`} value={c.totalWon.toLocaleString()} color="text-emerald-400" sub={`${c.winRate}% win rate`} />
                      ))}
                      {filtered.map((c, i) => (
                        <StatCard key={`l-${i}`} label={`Lost · ${c.currency}`} value={c.totalLost.toLocaleString()} color="text-red-400" />
                      ))}
                    </div>
                  </>
                );
              })()}
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="mb-4 font-display text-xl font-bold">IQ Option — Win vs Loss Over Time</h2>
                <RenderChart chartData={iqData?.tradesData ?? []} key1="value" key2="secondary" label1="Won" label2="Lost" color1={GREEN} color2={RED} chartType={chartType} />
              </div>
            </>
          ) : broker === "eo" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Won · USD" value={(eoData?.summary.totalWon ?? 0).toLocaleString()} color="text-emerald-400" sub={`${eoData?.summary.winRate ?? 0}% win rate`} />
                <StatCard label="Lost · USD" value={(eoData?.summary.totalLost ?? 0).toLocaleString()} color="text-red-400" />
                <StatCard label="Net Profit · USD" value={`$${((eoData?.summary.totalProfit ?? 0) - (eoData?.summary.totalLoss ?? 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="mb-4 font-display text-xl font-bold">ExpertOption — Win vs Loss Over Time</h2>
                <RenderChart chartData={eoData?.tradesData ?? []} key1="value" key2="secondary" label1="Won" label2="Lost" color1={GREEN} color2={RED} chartType={chartType} />
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Won · USD" value={(olympData?.summary.totalWon ?? 0).toLocaleString()} color="text-emerald-400" sub={`${olympData?.summary.winRate ?? 0}% win rate`} />
                <StatCard label="Lost · USD" value={(olympData?.summary.totalLost ?? 0).toLocaleString()} color="text-red-400" />
                <StatCard label="Net Profit · USD" value={`$${((olympData?.summary.totalProfit ?? 0) - (olympData?.summary.totalLoss ?? 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="mb-4 font-display text-xl font-bold">Olymp Trade — Win vs Loss Over Time</h2>
                <RenderChart chartData={olympData?.tradesData ?? []} key1="value" key2="secondary" label1="Won" label2="Lost" color1={GREEN} color2={RED} chartType={chartType} />
              </div>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">VIP Signals</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground">{summary?.signals.vipSignals ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">{summary?.signals.buySignals ?? 0} buy · {summary?.signals.sellSignals ?? 0} sell</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">PRO Signals</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground">{summary?.signals.proSignals ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">{summary?.signals.totalExecuted ?? 0} executed · {summary?.signals.totalFailed ?? 0} failed</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Delivery</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground">{summary?.signals.totalExecuted ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">{summary?.signals.totalSkipped ?? 0} skipped</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
