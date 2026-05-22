"use client";

import React, { useState } from "react";
import Image from "next/image";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type SortField = "totalProfit" | "winRate" | "wonCount" | "totalTrades";
type SortOrder = "asc" | "desc";
type BrokerFilter = "both" | "iq" | "eo" | "mt5";

interface IQCurrencyBreakdown {
  currency: string;
  totalTrades: number;
  wonCount: number;
  lostCount: number;
  netProfit: number;
  startingBalance?: number;
  currentBalance?: number;
  growthPercent?: number;
  profitBasis?: "balance" | "trades";
  winRate: number;
  isProfitable: boolean;
}

interface IQStat {
  totalTrades: number;
  wonCount: number;
  lostCount: number;
  winRate: number;
  byCurrency: IQCurrencyBreakdown[];
}

interface EOStat {
  currency: string;
  totalTrades: number;
  wonCount: number;
  lostCount: number;
  netProfit: number;
  startingBalance?: number;
  currentBalance?: number;
  growthPercent?: number;
  profitBasis?: "balance" | "trades";
  winRate: number;
  isProfitable: boolean;
  pipsWon?: number;
  pipsLost?: number;
}

interface IQAccount {
  email: string;
  currency: string;
  accountType: "REAL" | "PRACTICE";
  balance: number;
}

interface EOAccount {
  accountId: number;
  name: string;
  currency: string;
  balance: number;
  isDemo: boolean;
}

interface OverallStat {
  totalTrades: number;
  wonCount: number;
  lostCount: number;
  winRate: number;
}

interface ProfitUser {
  userId: string;
  email: string;
  fullName: string;
  plan: string;
  iqAccounts: number;
  eoAccounts: number;
  iqAccountsList: IQAccount[];
  eoAccountsList: EOAccount[];
  overall: OverallStat;
  iq: IQStat | null;
  eo: EOStat | null;
  mt5: EOStat | null;
}

interface ProfitSummaryResponse {
  total: number;
  winning: number;
  losing: number;
  users: ProfitUser[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLAN_STYLE: Record<string, string> = {
  VIP:      "bg-amber-500 text-white",
  PRO:      "bg-violet-500 text-white",
  STANDARD: "bg-sky-500 text-white",
  NONE:     "bg-white/10 text-muted-foreground",
};

const sym = (currency: string) =>
  currency === "NGN" ? "₦" : currency === "USD" ? "$" : `${currency} `;

function fmtNet(n: number, currency: string) {
  const s = sym(currency);
  const abs = Math.abs(n).toLocaleString(undefined, {
    maximumFractionDigits: currency === "NGN" ? 0 : 2,
    minimumFractionDigits: currency === "NGN" ? 0 : 2,
  });
  return `${n < 0 ? "-" : "+"}${s}${abs}`;
}

function fmtAbs(n: number, currency: string) {
  return `${sym(currency)}${Math.abs(n).toLocaleString(undefined, {
    maximumFractionDigits: currency === "NGN" ? 0 : 2,
    minimumFractionDigits: currency === "NGN" ? 0 : 2,
  })}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AdminUsersProfitSummary() {
  const [broker, setBroker]                 = useState<BrokerFilter>("both");
  const [sort, setSort]                     = useState<SortField>("totalTrades");
  const [order, setOrder]                   = useState<SortOrder>("desc");
  const [search, setSearch]                 = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery<ProfitSummaryResponse>({
    queryKey: ["admin-users-profit", broker, sort, order],
    queryFn: async () =>
      (await api.get("/admin/users/profit-summary", { params: { broker, sort, order, limit: 500 } })).data,
    retry: 1,
  });

  const users = (data?.users ?? []).filter((u) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return u.email.toLowerCase().includes(term) || u.fullName?.toLowerCase().includes(term);
  });

  function toggleSort(field: SortField) {
    if (sort === field) setOrder((o) => (o === "desc" ? "asc" : "desc"));
    else { setSort(field); setOrder("desc"); }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sort !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    return order === "desc"
      ? <ArrowDown className="ml-1 h-3 w-3 text-primary" />
      : <ArrowUp className="ml-1 h-3 w-3 text-primary" />;
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      {data && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="font-semibold text-emerald-400">{data.winning} Profitable</span>
          </div>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-2 text-sm">
            <TrendingDown className="h-4 w-4 text-red-400" />
            <span className="font-semibold text-red-400">{data.losing} Net Loss</span>
          </div>
          <span className="text-xs text-muted-foreground">out of {data.total} connected users</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          {(["both", "iq", "eo", "mt5"] as BrokerFilter[]).map((b) => (
            <button
              key={b}
              onClick={() => setBroker(b)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                broker === b
                  ? "bg-white/[0.1] text-foreground shadow-sm ring-1 ring-white/[0.08]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {b === "iq" && <Image src="/autobot-assets/iq-option-small.svg" alt="IQ" width={12} height={12} className="h-3 w-3 object-contain" />}
              {b === "eo" && <Image src="/autobot-assets/experoptionlogo.png" alt="EO" width={12} height={12} className="h-3 w-3 object-contain" />}
              {b === "both" ? "All Brokers" : b === "iq" ? "IQ Option" : b === "mt5" ? "MT5" : "ExpertOption"}
            </button>
          ))}
        </div>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search user…"
          className="h-8 w-48 text-xs"
        />

        <Button variant="outline" size="sm" className="ml-auto h-8 text-xs" onClick={() => refetch()} disabled={isRefetching}>
          {isRefetching ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1.5 h-3 w-3" />}
          Refresh
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center text-sm text-muted-foreground">
          No trade data found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02] text-xs text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Plan</th>
                <th className="px-4 py-3 text-right font-medium">
                  <button className="flex items-center justify-end gap-0.5 hover:text-foreground transition-colors" onClick={() => toggleSort("totalTrades")}>
                    Trades <SortIcon field="totalTrades" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  <button className="flex items-center justify-end gap-0.5 hover:text-foreground transition-colors" onClick={() => toggleSort("winRate")}>
                    Win% <SortIcon field="winRate" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center font-medium">IQ Net P&L</th>
                <th className="px-4 py-3 text-center font-medium">EO Net P&L</th>
                <th className="px-4 py-3 text-center font-medium">MT5 Net P&L</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {users.map((user) => {
                const isExpanded = expandedUserId === user.userId;
                const overall    = user.overall;
                const iqNets     = (user.iq?.byCurrency ?? []).map((c) => ({ currency: c.currency, net: c.netProfit }));

                return (
                  <React.Fragment key={user.userId}>
                    <tr className={`transition-colors hover:bg-white/[0.03] ${overall.winRate >= 50 ? "bg-emerald-500/[0.015]" : "bg-red-500/[0.015]"}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground truncate max-w-[160px]">{user.fullName || user.email}</p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{user.email}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {user.iqAccounts > 0 && `IQ: ${user.iqAccounts} acct${user.iqAccounts !== 1 ? "s" : ""}`}
                          {user.iqAccounts > 0 && user.eoAccounts > 0 && " · "}
                          {user.eoAccounts > 0 && `EO: ${user.eoAccounts} acct${user.eoAccounts !== 1 ? "s" : ""}`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PLAN_STYLE[user.plan ?? "NONE"] ?? PLAN_STYLE.NONE}`}>
                          {user.plan || "FREE"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {overall.totalTrades}
                        <span className="block text-[10px]">{overall.wonCount}W / {overall.lostCount}L</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${overall.winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                          {overall.winRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {iqNets.length === 0 ? (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        ) : (
                          <div className="space-y-0.5">
                            {iqNets.map((n) => (
                              <p key={n.currency} className={`text-xs font-semibold ${n.net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {fmtNet(n.net, n.currency)}
                                <span className="ml-1 text-[9px] text-muted-foreground">{n.currency}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {user.eo ? (
                          <p className={`text-xs font-semibold ${user.eo.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {fmtNet(user.eo.netProfit, "USD")}
                          </p>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {user.mt5 ? (
                          <p className={`text-xs font-semibold ${user.mt5.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {fmtNet(user.mt5.netProfit, "USD")}
                          </p>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => setExpandedUserId(isExpanded ? null : user.userId)}
                          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${user.userId}-detail`} className="bg-white/[0.012]">
                        <td colSpan={8} className="px-4 pb-5 pt-3">
                          <div className="grid gap-3 lg:grid-cols-3">

                            {/* IQ Option */}
                            <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-3 space-y-3">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300">
                                <Image src="/autobot-assets/iq-option-small.svg" alt="IQ" width={12} height={12} className="h-3 w-3 object-contain" />
                                IQ Option
                                <span className="ml-auto text-muted-foreground font-normal">{user.iqAccounts} account{user.iqAccounts !== 1 ? "s" : ""}</span>
                              </div>

                              {user.iqAccountsList.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                                    <Wallet className="h-2.5 w-2.5" /> Account Balances
                                  </p>
                                  {user.iqAccountsList.map((acc, i) => (
                                    <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[11px]">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`h-1.5 w-1.5 rounded-full ${acc.accountType === "REAL" ? "bg-emerald-400" : "bg-amber-400"}`} />
                                        <span className="text-muted-foreground truncate max-w-[110px]">{acc.email}</span>
                                        <span className="text-muted-foreground/50">·</span>
                                        <span className="text-muted-foreground">{acc.accountType}</span>
                                      </div>
                                      <span className="font-semibold text-foreground">
                                        {fmtAbs(acc.balance, acc.currency)}
                                        <span className="ml-1 text-[9px] text-muted-foreground">{acc.currency}</span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {user.iq ? (
                                <div className="space-y-2">
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Profit/Loss</p>
                                  {user.iq.byCurrency.map((c) => (
                                    <div key={c.currency} className="rounded-lg bg-white/[0.03] px-2.5 py-2">
                                      <div className="flex items-center justify-between mb-1.5 text-[11px]">
                                        <span className="font-semibold text-foreground">{c.currency}</span>
                                        <span className={`font-bold ${c.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtNet(c.netProfit, c.currency)}</span>
                                      </div>
                                      <p className="mb-1.5 text-[10px] text-muted-foreground">
                                        {c.profitBasis === "balance" ? "Growth since connected" : "Trade net"}
                                        {c.profitBasis === "balance" && typeof c.growthPercent === "number" ? ` · ${c.growthPercent.toFixed(2)}%` : ""}
                                      </p>
                                      <div className="grid grid-cols-3 gap-1 text-[10px]">
                                        <div><p className="text-muted-foreground">Trades</p><p className="font-semibold">{c.totalTrades}</p></div>
                                        <div><p className="text-muted-foreground">Win%</p><p className={`font-semibold ${c.winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>{c.winRate}%</p></div>
                                        <div><p className="text-muted-foreground">Won/Lost</p><p className="font-semibold">{c.wonCount}/{c.lostCount}</p></div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No IQ trades recorded</p>
                              )}
                            </div>

                            {/* ExpertOption */}
                            <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-3 space-y-3">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                                <Image src="/autobot-assets/experoptionlogo.png" alt="EO" width={12} height={12} className="h-3 w-3 object-contain" />
                                ExpertOption
                                <span className="ml-auto text-muted-foreground font-normal">{user.eoAccounts} account{user.eoAccounts !== 1 ? "s" : ""}</span>
                              </div>

                              {user.eoAccountsList.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                                    <Wallet className="h-2.5 w-2.5" /> Account Balances
                                  </p>
                                  {user.eoAccountsList.map((acc, i) => (
                                    <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[11px]">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`h-1.5 w-1.5 rounded-full ${acc.isDemo ? "bg-amber-400" : "bg-emerald-400"}`} />
                                        <span className="text-muted-foreground truncate max-w-[110px]">{acc.name || `ID: ${acc.accountId}`}</span>
                                        <span className="text-muted-foreground/50">·</span>
                                        <span className="text-muted-foreground">{acc.isDemo ? "DEMO" : "REAL"}</span>
                                      </div>
                                      <span className="font-semibold text-foreground">
                                        ${acc.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        <span className="ml-1 text-[9px] text-muted-foreground">USD</span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {user.eo ? (
                                <div className="space-y-2">
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Profit/Loss</p>
                                  <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
                                    <div className="flex items-center justify-between mb-1.5 text-[11px]">
                                      <span className="font-semibold text-foreground">USD</span>
                                      <span className={`font-bold ${user.eo.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtNet(user.eo.netProfit, "USD")}</span>
                                    </div>
                                    <p className="mb-1.5 text-[10px] text-muted-foreground">
                                      {user.eo.profitBasis === "balance" ? "Growth since connected" : "Trade net"}
                                      {user.eo.profitBasis === "balance" && typeof user.eo.growthPercent === "number" ? ` · ${user.eo.growthPercent.toFixed(2)}%` : ""}
                                    </p>
                                    <div className="grid grid-cols-3 gap-1 text-[10px]">
                                      <div><p className="text-muted-foreground">Trades</p><p className="font-semibold">{user.eo.totalTrades}</p></div>
                                      <div><p className="text-muted-foreground">Win%</p><p className={`font-semibold ${user.eo.winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>{user.eo.winRate}%</p></div>
                                      <div><p className="text-muted-foreground">Won/Lost</p><p className="font-semibold">{user.eo.wonCount}/{user.eo.lostCount}</p></div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No EO trades recorded</p>
                              )}
                            </div>

                            {/* MT5 */}
                            <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] p-3 space-y-3">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
                                MT5
                              </div>

                              {user.mt5 ? (
                                <div className="space-y-2">
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Profit/Loss</p>
                                  <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
                                    <div className="flex items-center justify-between mb-1.5 text-[11px]">
                                      <span className="font-semibold text-foreground">USD</span>
                                      <span className={`font-bold ${user.mt5.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtNet(user.mt5.netProfit, "USD")}</span>
                                    </div>
                                    <p className="mb-1.5 text-[10px] text-muted-foreground">Trade net</p>
                                    <div className="grid grid-cols-3 gap-1 text-[10px]">
                                      <div><p className="text-muted-foreground">Trades</p><p className="font-semibold">{user.mt5.totalTrades}</p></div>
                                      <div><p className="text-muted-foreground">Pips Won</p><p className="font-semibold text-emerald-400">+{user.mt5.pipsWon ?? 0}</p></div>
                                      <div><p className="text-muted-foreground">Pips Lost</p><p className="font-semibold text-red-400">-{user.mt5.pipsLost ?? 0}</p></div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No MT5 trades recorded</p>
                              )}
                            </div>
                          </div>

                          {/* Overall counts */}
                          <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Overall (all brokers)</p>
                            <div className="grid grid-cols-4 gap-2 text-[11px]">
                              <div><p className="text-muted-foreground">Total Trades</p><p className="font-semibold">{overall.totalTrades}</p></div>
                              <div><p className="text-muted-foreground">Won</p><p className="font-semibold text-emerald-400">{overall.wonCount}</p></div>
                              <div><p className="text-muted-foreground">Lost</p><p className="font-semibold text-red-400">{overall.lostCount}</p></div>
                              <div><p className="text-muted-foreground">Win Rate</p><p className={`font-semibold ${overall.winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>{overall.winRate}%</p></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
