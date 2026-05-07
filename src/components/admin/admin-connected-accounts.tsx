"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, Circle, Search, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatTimeAgo } from "@/lib/utils";

interface ConnectedAccount {
  broker: "iq" | "eo";
  accountId?: string | null;
  accountName?: string;
  status: "connected" | "disconnected" | "connecting" | "error";
  lastConnected: string;
  metadata?: {
    balance?: number;
    currency?: string;
    [key: string]: any;
  };
  user: {
    _id?: string;
    email?: string;
    fullName?: string;
  };
}

interface ConnectedAccountsResponse {
  total: number;
  connectedTotal: number;
  byBroker?: {
    iq: { total: number; connected: number };
    eo: { total: number; connected: number };
  };
  accounts: ConnectedAccount[];
}

function getStatusBadge(status: string) {
  switch (status) {
    case "connected":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
          <Circle className="h-1.5 w-1.5 fill-emerald-400 animate-pulse" />
          Connected
        </span>
      );
    case "disconnected":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400">
          <Circle className="h-1.5 w-1.5 fill-red-400" />
          Offline
        </span>
      );
    case "connecting":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-semibold text-yellow-400">
          <Circle className="h-1.5 w-1.5 fill-yellow-400 animate-pulse" />
          Connecting
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400">
          <AlertCircle className="h-1.5 w-1.5" />
          Error
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-500/10 px-2.5 py-1 text-xs font-semibold text-gray-400">
          <Circle className="h-1.5 w-1.5 fill-gray-400" />
          Unknown
        </span>
      );
  }
}

export function AdminConnectedAccounts() {
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery<ConnectedAccountsResponse>({
    queryKey: ["admin-connected-accounts"],
    queryFn: async () => {
      const res = await api.get("/admin/connected-accounts");
      return res.data;
    },
    refetchInterval: 15000, // Refresh every 15s to keep "live" feel
  });

  const normalizeSearchValue = (value: unknown) => String(value ?? "").toLowerCase();
  const filteredAccounts = (data?.accounts || []).filter((acc) => {
    const q = normalizeSearchValue(search);
    if (!q) return true;

    return [
      acc.accountId,
      acc.broker,
      acc.accountName,
      acc.user?.email,
      acc.user?.fullName,
    ].some((value) => normalizeSearchValue(value).includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground flex items-center gap-3">
            Connected Accounts
            {data && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-medium text-emerald-400">
                <Circle className="h-2 w-2 fill-emerald-400 animate-pulse" />
                {data.connectedTotal ?? data.total} Live
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time overview of active broker connections across the platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      {data?.byBroker && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.05] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300/70">IQ Option</p>
            <p className="mt-2 font-display text-2xl font-bold">{data.byBroker.iq.connected} live</p>
            <p className="mt-1 text-xs text-muted-foreground">{data.byBroker.iq.total} saved accounts</p>
          </div>
          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.05] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300/70">ExpertOption</p>
            <p className="mt-2 font-display text-2xl font-bold">{data.byBroker.eo.connected} live</p>
            <p className="mt-1 text-xs text-muted-foreground">{data.byBroker.eo.total} saved accounts</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search user, broker, account..."
          className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] pl-10 pr-4 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-white/[0.03] text-muted-foreground font-semibold border-b border-white/[0.08]">
              <tr>
                <th className="px-5 py-3">App User</th>
                <th className="px-5 py-3">Broker</th>
                <th className="px-5 py-3">Account</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Balance</th>
                <th className="px-5 py-3 text-right">Last Connected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Circle className="h-8 w-8 text-muted-foreground/30" />
                      <p>No active connections found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc, index) => (
                  <tr key={`${acc.user?._id ?? "user"}-${acc.broker}-${acc.accountId ?? acc.accountName ?? index}`} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{acc.user?.fullName || "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">{acc.user?.email || "No email"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${acc.broker === "eo" ? "bg-purple-500/15 text-purple-300" : "bg-blue-500/15 text-blue-300"}`}>
                        {acc.broker === "eo" ? "ExpertOption" : "IQ Option"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-foreground/90 bg-white/[0.04] px-2 py-1 rounded">
                        {acc.accountId || acc.accountName || "Unknown account"}
                      </span>
                      {acc.accountName && <p className="mt-1 text-xs text-muted-foreground">{acc.accountName}</p>}
                    </td>
                    <td className="px-5 py-4">
                      {getStatusBadge(acc.status)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {acc.metadata?.balance !== undefined ? (
                        <span className="font-medium text-foreground">
                          {formatCurrency(acc.metadata.balance, acc.metadata.currency || "USD")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Unknown</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right text-muted-foreground">
                      {formatTimeAgo(acc.lastConnected)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
