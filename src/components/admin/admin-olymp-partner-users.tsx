"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

/**
 * Operational view of every Olymp Partner account.
 *
 * The filters are the questions actually asked about these users — who has
 * funded, who is switched on, who is losing — so each is a click rather than
 * something to work out by reading the table.
 */

interface PartnerUser {
  userId: string;
  name: string;
  email: string;
  olympUserId: number;
  linkMethod: "created" | "claimed";
  linkedAt: string | null;
  tradingEnabled: boolean;
  martingaleEnabled: boolean;
  martingaleSteps: number[];
  baseAmount: number;
  balance: number | null;
  currency: string;
  balanceCheckedAt: string | null;
  deposited: boolean;
  trades: number;
  wins: number;
  losses: number;
  netProfit: number;
  lastTradeAt: string | null;
}

interface Overview {
  totals: {
    connected: number;
    tradingOn: number;
    tradingOff: number;
    deposited: number;
    notDeposited: number;
    inProfit: number;
    losing: number;
    neverTraded: number;
  };
  users: PartnerUser[];
}

type Filter =
  | "all" | "tradingOn" | "tradingOff" | "deposited"
  | "notDeposited" | "inProfit" | "losing" | "neverTraded";

const FILTERS: Array<{ key: Filter; label: string; totalKey?: keyof Overview["totals"] }> = [
  { key: "all", label: "All connected", totalKey: "connected" },
  { key: "tradingOn", label: "Trading on", totalKey: "tradingOn" },
  { key: "tradingOff", label: "Trading off", totalKey: "tradingOff" },
  { key: "deposited", label: "Deposited", totalKey: "deposited" },
  { key: "notDeposited", label: "Not deposited", totalKey: "notDeposited" },
  { key: "inProfit", label: "In profit", totalKey: "inProfit" },
  { key: "losing", label: "Losing", totalKey: "losing" },
  { key: "neverTraded", label: "Never traded", totalKey: "neverTraded" },
];

function matches(user: PartnerUser, filter: Filter): boolean {
  switch (filter) {
    case "tradingOn": return user.tradingEnabled;
    case "tradingOff": return !user.tradingEnabled;
    case "deposited": return user.balance !== null && user.deposited;
    case "notDeposited": return user.balance !== null && !user.deposited;
    // Neither winning nor losing until they have actually traded.
    case "inProfit": return user.trades > 0 && user.netProfit > 0;
    case "losing": return user.trades > 0 && user.netProfit < 0;
    case "neverTraded": return user.trades === 0;
    default: return true;
  }
}

export function AdminOlympPartnerUsers() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<Overview>({
    queryKey: ["admin-olymp-partner-overview"],
    queryFn: async () => (await api.get("/admin/olymp-partner/overview")).data as Overview,
    refetchInterval: 60_000,
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.users ?? [])
      .filter((user) => matches(user, filter))
      .filter((user) =>
        !term
        || user.email.toLowerCase().includes(term)
        || user.name.toLowerCase().includes(term)
        || String(user.olympUserId).includes(term));
  }, [data, filter, search]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading Olymp accounts…
      </div>
    );
  }

  const totals = data?.totals;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">Olymp Partner accounts</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Every Olymp account connected through NOJAI, and what it is doing.
        </p>
      </div>

      {/* Each tile is a filter, so a count is never a dead end. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FILTERS.map((item) => {
          const count = item.totalKey && totals ? totals[item.totalKey] : 0;
          const active = filter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                active
                  ? "border-primary/40 bg-primary/[0.08]"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/20"
              }`}
            >
              <p className="font-display text-xl font-semibold">{count}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{item.label}</p>
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, email or Olymp ID"
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-white/[0.03]">
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Olymp ID</th>
              <th className="px-4 py-3 font-medium">Balance</th>
              <th className="px-4 py-3 font-medium">Trading</th>
              <th className="px-4 py-3 font-medium">Trades</th>
              <th className="px-4 py-3 font-medium">P&amp;L</th>
              <th className="px-4 py-3 font-medium">Last trade</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No accounts match this view.
                </td>
              </tr>
            ) : rows.map((user) => (
              <tr key={user.userId} className="border-t border-white/[0.05]">
                <td className="px-4 py-3">
                  <p className="font-medium">{user.name || "—"}</p>
                  <p className="text-[11px] text-muted-foreground">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-mono text-xs">{user.olympUserId}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {user.linkMethod === "claimed" ? "connected by user" : "opened by NOJAI"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {/* Never read means unknown, which is not the same as zero —
                      saying "not deposited" for a balance we have not checked
                      would be a guess presented as a fact. */}
                  {user.balance === null ? (
                    <span className="text-xs text-muted-foreground">not checked yet</span>
                  ) : (
                    <>
                      <p className={user.deposited ? "font-medium" : "font-medium text-amber-300"}>
                        {formatCurrency(user.balance, user.currency)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {user.balanceCheckedAt ? formatDate(user.balanceCheckedAt) : ""}
                      </p>
                    </>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={user.tradingEnabled ? "success" : "secondary"}>
                    {user.tradingEnabled ? "On" : "Off"}
                  </Badge>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {formatCurrency(user.baseAmount, user.currency)}
                    {user.martingaleEnabled ? ` · ${user.martingaleSteps.length}-step` : " · flat"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {user.trades === 0 ? (
                    <span className="text-xs text-muted-foreground">none</span>
                  ) : (
                    <>
                      <p className="font-medium">{user.trades}</p>
                      <p className="text-[10px] text-muted-foreground">{user.wins}W · {user.losses}L</p>
                    </>
                  )}
                </td>
                <td className="px-4 py-3">
                  {user.trades === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <span className={`font-medium ${user.netProfit > 0 ? "text-emerald-400" : user.netProfit < 0 ? "text-red-400" : ""}`}>
                      {user.netProfit > 0 ? "+" : ""}{formatCurrency(user.netProfit, user.currency)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {user.lastTradeAt ? formatDate(user.lastTradeAt) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] leading-5 text-muted-foreground">
        Balances are the last figure read from Olymp, with the time it was read — they are not live. P&amp;L
        covers real-money partner trades only, and excludes wins whose payout Olymp never stated.
      </p>
    </div>
  );
}
