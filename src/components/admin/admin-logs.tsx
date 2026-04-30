"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2, RefreshCw, AlertTriangle, Info, AlertCircle, Eye, ChevronLeft, ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface SystemLog {
  _id: string;
  level: "info" | "warn" | "error";
  source: string;
  message: string;
  metadata?: any;
  userId?: { _id: string; email: string; fullName: string };
  createdAt: string;
}

interface LogsResponse {
  logs: SystemLog[];
  total: number;
  page: number;
  pages: number;
}

const LEVEL_CONFIG = {
  info: { icon: Info, className: "bg-blue-500/15 text-blue-300", label: "Info" },
  warn: { icon: AlertTriangle, className: "bg-amber-500/15 text-amber-300", label: "Warn" },
  error: { icon: AlertCircle, className: "bg-red-500/15 text-red-300", label: "Error" },
};

export function AdminLogs() {
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState<"all" | "info" | "warn" | "error">("all");
  const [source, setSource] = useState<"all" | "system" | "bot" | "auth" | "payment" | "user" | "affiliate">("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery<LogsResponse>({
    queryKey: ["admin-logs", page, level, source],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (level !== "all") params.append("level", level);
      if (source !== "all") params.append("source", source);
      const res = await api.get(`/admin/logs?${params.toString()}`);
      return res.data;
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">System Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time tracking for events, errors, and logins.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white/[0.02] border border-white/[0.08] p-4 rounded-xl">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Level</label>
          <select
            value={level}
            onChange={(e) => { setLevel(e.target.value as any); setPage(1); }}
            className="h-9 w-32 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Source</label>
          <select
            value={source}
            onChange={(e) => { setSource(e.target.value as any); setPage(1); }}
            className="h-9 w-40 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All Sources</option>
            <option value="system">System</option>
            <option value="bot">Bot</option>
            <option value="auth">Auth</option>
            <option value="payment">Payment</option>
            <option value="user">User</option>
            <option value="affiliate">Affiliate</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-white/[0.03] text-muted-foreground font-semibold border-b border-white/[0.08]">
              <tr>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 w-full">Message</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : !data || data.logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No logs found.
                  </td>
                </tr>
              ) : (
                data.logs.map((log) => {
                  const Cfg = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.info;
                  const Icon = Cfg.icon;
                  const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;
                  const isExpanded = expandedLogId === log._id;

                  return (
                    <React.Fragment key={log._id}>
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(log.createdAt, "MMM d, yyyy 'at' HH:mm")}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${Cfg.className}`}>
                            <Icon className="h-3 w-3" /> {Cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground uppercase">
                          {log.source}
                        </td>
                        <td className="px-4 py-3 text-foreground font-medium truncate max-w-sm">
                          {log.message}
                        </td>
                        <td className="px-4 py-3">
                          {log.userId ? (
                            <div className="flex flex-col">
                              <span className="text-foreground text-xs">{log.userId.fullName || log.userId.email}</span>
                              <span className="text-[10px] text-muted-foreground truncate w-32">{log.userId.email}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">System / Anonymous</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setExpandedLogId(isExpanded ? null : log._id)}
                            disabled={!hasMeta}
                          >
                            <Eye className={`h-4 w-4 ${hasMeta ? "text-primary" : "text-muted-foreground/30"}`} />
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && hasMeta && (
                        <tr className="bg-black/20 border-t-0">
                          <td colSpan={6} className="px-4 py-3">
                            <pre className="text-[10px] font-mono text-primary/80 overflow-x-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 border border-white/[0.05]">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.08] bg-white/[0.01]">
            <p className="text-xs text-muted-foreground">
              Showing page {data.page} of {data.pages} ({data.total} total logs)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 px-2"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="h-8 px-2"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
