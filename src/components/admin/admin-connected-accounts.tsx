"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, Circle, Search, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatTimeAgo } from "@/lib/utils";

interface ConnectedAccount {
  accountId: string;
  status: "connected" | "disconnected" | "connecting" | "error";
  lastConnected: string;
  metadata?: {
    balance?: number;
    currency?: string;
    [key: string]: any;
  };
  user: {
    _id: string;
    email: string;
    fullName: string;
  };
}

interface ConnectedAccountsResponse {
  total: number;
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

  const filteredAccounts = (data?.accounts || []).filter((acc) => {
    const q = search.toLowerCase();
    return (
      acc.accountId.toLowerCase().includes(q) ||
      acc.user.email.toLowerCase().includes(q) ||
      acc.user.fullName?.toLowerCase().includes(q)
    );
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
                {data.total} Active
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
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by user or broker email..."
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
                <th className="px-5 py-3">Broker Email</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Balance</th>
                <th className="px-5 py-3 text-right">Last Connected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Circle className="h-8 w-8 text-muted-foreground/30" />
                      <p>No active connections found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={`${acc.user._id}-${acc.accountId}`} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{acc.user.fullName || "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">{acc.user.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-foreground/90 bg-white/[0.04] px-2 py-1 rounded">
                        {acc.accountId}
                      </span>
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
