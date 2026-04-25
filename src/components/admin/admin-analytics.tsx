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
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  LineChart,
  PieChart as PieChartIcon,
  RefreshCw,
  Wallet,
  Users,
  Zap,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";

interface AnalyticsDataPoint {
  time: string;
  date: string;
  value: number;
  secondary: number;
}

interface AnalyticsResponse {
  profitabilityData: AnalyticsDataPoint[];
  revenueData: AnalyticsDataPoint[];
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
    revenue: { vip: number; pro: number; standard: number; total: number };
  };
}

export function AdminAnalytics() {
  const [timeframe, setTimeframe] = useState<"1H" | "1D" | "1W" | "1M" | "ALL">("1D");
  const [chartType, setChartType] = useState<"area" | "bar" | "pie">("area");

  const { data, isLoading, refetch, isRefetching } = useQuery<AnalyticsResponse>({
    queryKey: ["admin-analytics", timeframe],
    queryFn: async () => (await api.get("/admin/analytics", { params: { timeframe } })).data,
  });

  const profitabilityData = data?.profitabilityData || [];
  const revenueData = data?.revenueData || [];
  const tradesData = data?.tradesData || [];
  const summary = data?.summary;

  const COLORS = ["#00C49F", "#FF8042", "#0088FE", "#FFBB28"];

  const renderChart = (chartData: any[], dataKey1: string, dataKey2: string, name1: string, name2: string, formatAsCurrency = false) => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex h-[350px] items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-muted-foreground">
          No data available for this timeframe
        </div>
      );
    }

    if (chartType === "pie") {
      const total1 = chartData.reduce((acc, curr) => acc + curr[dataKey1], 0);
      const total2 = chartData.reduce((acc, curr) => acc + curr[dataKey2], 0);
      const pieData = [
        { name: name1, value: total1 },
        { name: name2, value: total2 },
      ];
      return (
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => (formatAsCurrency ? formatCurrency(Number(value)) : value)}
              contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00C49F" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#00C49F" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="colorSecondary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0088FE" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#0088FE" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => (formatAsCurrency ? `$${val}` : val)} />
            <Tooltip
              contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }}
              formatter={(value: any) => (formatAsCurrency ? formatCurrency(Number(value)) : value)}
            />
            <Legend />
            <Bar dataKey={dataKey1} name={name1} fill="url(#colorPrimary)" radius={[4, 4, 0, 0]} />
            <Bar dataKey={dataKey2} name={name2} fill="url(#colorSecondary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorArea1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00C49F" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#00C49F" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorArea2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0088FE" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#0088FE" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => (formatAsCurrency ? `$${val}` : val)} />
          <Tooltip
            contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }}
            formatter={(value: any) => (formatAsCurrency ? formatCurrency(Number(value)) : value)}
          />
          <Legend />
          <Area type="monotone" dataKey={dataKey1} name={name1} stroke="#00C49F" strokeWidth={3} fillOpacity={1} fill="url(#colorArea1)" />
          <Area type="monotone" dataKey={dataKey2} name={name2} stroke="#0088FE" strokeWidth={3} fillOpacity={1} fill="url(#colorArea2)" />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <section className="glass-panel relative overflow-hidden rounded-[32px] p-6 sm:p-8">
        <div className="surface-grid absolute inset-0 opacity-15" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/20">
              Live Database Active
            </Badge>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">Platform Data</h1>
            <p className="text-sm text-muted-foreground">Monitor scaling, profitability, and user interactions with live data.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Chart Type Toggles */}
            <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.03] p-1">
              {[
                { id: "area", icon: LineChart, label: "Area" },
                { id: "bar", icon: BarChart3, label: "Bar" },
                { id: "pie", icon: PieChartIcon, label: "Pie" },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setChartType(type.id as any)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    chartType === type.id ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <type.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{type.label}</span>
                </button>
              ))}
            </div>

            {/* Timeframe Toggles */}
            <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.03] p-1">
              {["1H", "1D", "1W", "1M", "ALL"].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf as any)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    timeframe === tf ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="profitability" className="space-y-6">
        <TabsList className="glass-panel flex h-auto flex-wrap items-center justify-start gap-2 rounded-2xl border-white/10 bg-white/[0.03] p-2">
          <TabsTrigger value="profitability" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white/10">
            <Activity className="mr-2 h-4 w-4" />
            Profitability
          </TabsTrigger>
          <TabsTrigger value="revenue" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white/10">
            <Wallet className="mr-2 h-4 w-4" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="trades" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white/10">
            <Zap className="mr-2 h-4 w-4" />
            Trades Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profitability" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Total User Profit</p>
              <p className="mt-3 font-display text-4xl font-bold text-foreground">
                {formatCurrency(summary?.totalTradeProfit ?? 0)}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Win Rate</p>
              <p className="mt-3 font-display text-4xl font-bold text-emerald-400">{summary?.winRate ?? 0}%</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Total Loss</p>
              <p className="mt-3 font-display text-4xl font-bold text-red-400">
                {formatCurrency(summary?.totalTradeLoss ?? 0)}
              </p>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-6 font-display text-xl font-bold">Profitability vs Time</h2>
            {renderChart(profitabilityData, "value", "secondary", "Total User Profit", "Admin Account Profit", true)}
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">VIP Revenue</p>
              <p className="mt-3 font-display text-3xl font-bold text-foreground">{formatCurrency(summary?.revenue.vip ?? 0)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">PRO Revenue</p>
              <p className="mt-3 font-display text-3xl font-bold text-foreground">{formatCurrency(summary?.revenue.pro ?? 0)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Total Revenue</p>
              <p className="mt-3 font-display text-3xl font-bold text-foreground">{formatCurrency(summary?.revenue.total ?? 0)}</p>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-6 font-display text-xl font-bold">Subscription Revenue Scaling</h2>
            {renderChart(revenueData, "value", "secondary", "VIP Revenue", "PRO Revenue", true)}
          </div>
        </TabsContent>

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
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Signal Delivery</p>
              <p className="mt-3 font-display text-3xl font-bold text-foreground">{summary?.signals.totalExecuted ?? 0}</p>
              <p className="mt-1 text-sm text-muted-foreground">{summary?.signals.totalSkipped ?? 0} skipped</p>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-6 font-display text-xl font-bold">Trades Executed Over Time</h2>
            {renderChart(tradesData, "value", "secondary", "Winning Trades", "Losing Trades")}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
