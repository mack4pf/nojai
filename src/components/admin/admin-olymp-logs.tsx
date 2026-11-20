"use client";

/**
 * Every trade the admin placed from the Olymp panel, and what reached the
 * followers.
 *
 * The live feed on the accounts page is in memory and gone on restart, which
 * answers "is it going out right now". This answers "what did we send, and
 * who actually got it" — so it reads the durable log and keeps the follower
 * counts as they were reported at the time.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface LogEntry {
  id: string;
  olympUserId?: number;
  accountLabel?: string;
  source: "partner" | "socket";
  asset: string;
  direction: "call" | "put";
  amount: number;
  durationSecs: number;
  group: "real" | "demo";
  tradeId: string;
  mirrored: boolean;
  followers: { attempted: number; placed: number; failed: number; reason?: string };
  skipped?: string;
  error?: string;
  createdAt: string;
}

interface LogResponse {
  entries: LogEntry[];
  total: number;
  page: number;
  pages: number;
  summary: {
    trades: number;
    mirrored: number;
    followersPlaced: number;
    followersFailed: number;
    realTrades: number;
  };
}

type Scope = "all" | "mirrored" | "own";
type GroupFilter = "all" | "real" | "demo";

const SCOPE_LABELS: Record<Scope, string> = {
  all: "All",
  mirrored: "Reached followers",
  own: "My account only",
};

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return secs % 60 === 0 ? `${secs / 60}m` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return secs % 3600 === 0 ? `${secs / 3600}h` : `${Math.floor(secs / 3600)}h ${Math.round((secs % 3600) / 60)}m`;
}

/** Turns a machine reason into something readable, without inventing detail. */
function explain(entry: LogEntry): string {
  if (entry.mirrored) {
    const { placed, attempted, failed } = entry.followers;
    if (attempted === 0) {
      return entry.followers.reason === "pair-not-tradeable"
        ? "Olymp would not copy this instrument"
        : "Nobody was following";
    }
    return `${placed} of ${attempted} copied${failed > 0 ? `, ${failed} failed` : ""}`;
  }
  if (entry.skipped === "mirror-off") return "Mirroring was off";
  if (entry.skipped === "account-not-real") return "Practice account (rule since removed)";
  if (entry.skipped === "mirror-failed") return entry.error ?? "Copying failed";
  return "Not copied";
}

export function AdminOlympLogs() {
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState<Scope>("all");
  const [group, setGroup] = useState<GroupFilter>("all");

  const { data, isLoading, isError } = useQuery<LogResponse>({
    queryKey: ["admin-olymp-logs", page, scope, group],
    queryFn: async () => {
      const res = await api.get<LogResponse>("/admin/olymp-logs", {
        params: {
          page,
          limit: 25,
          ...(scope === "all" ? {} : { scope }),
          ...(group === "all" ? {} : { group }),
        },
      });
      return res.data;
    },
    retry: 1,
  });

  const entries = data?.entries ?? [];
  const summary = data?.summary;
  const pages = data?.pages ?? 1;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Trades placed</p>
          <p className="mt-2 font-display text-3xl font-bold">{summary?.trades ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">{summary?.realTrades ?? 0} on a real balance</p>
        </div>
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Reached followers</p>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-300">{summary?.mirrored ?? 0}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Follower deals placed</p>
          <p className="mt-2 font-display text-3xl font-bold">{summary?.followersPlaced ?? 0}</p>
        </div>
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400">Follower deals failed</p>
          <p className="mt-2 font-display text-3xl font-bold text-amber-300">{summary?.followersFailed ?? 0}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["all", "mirrored", "own"] as Scope[]).map((value) => (
            <button
              key={value}
              onClick={() => { setScope(value); setPage(1); }}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
                scope === value ? "bg-white/[0.1] text-foreground" : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
              }`}
            >
              {SCOPE_LABELS[value]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "real", "demo"] as GroupFilter[]).map((value) => (
            <button
              key={value}
              onClick={() => { setGroup(value); setPage(1); }}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
                group === value ? "bg-white/[0.1] text-foreground" : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
              }`}
            >
              {value === "all" ? "Both balances" : value}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 p-5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Failed to load the Olymp logs.
          </div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {scope === "all" && group === "all"
              ? "Nothing logged yet. A trade placed from the Olymp accounts page appears here."
              : "No trade matched this filter."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-5 py-4">When</th>
                  <th className="px-5 py-4">Account</th>
                  <th className="px-5 py-4">Trade</th>
                  <th className="px-5 py-4">Stake</th>
                  <th className="px-5 py-4">Balance</th>
                  <th className="px-5 py-4">Followers</th>
                  <th className="px-5 py-4">Deal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {entries.map((entry) => (
                  <tr key={entry.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {formatDate(entry.createdAt, "MMM d, yyyy")}
                      <br />
                      <span className="text-[11px] opacity-60">{formatDate(entry.createdAt, "HH:mm:ss")}</span>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-xs font-medium text-foreground">
                        {entry.accountLabel || (entry.olympUserId ? `Olymp ${entry.olympUserId}` : "—")}
                      </p>
                      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{entry.source}</span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        {entry.direction === "call" ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                        )}
                        <span className="text-xs font-semibold text-foreground">{entry.asset}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{formatDuration(entry.durationSecs)}</span>
                    </td>

                    <td className="px-5 py-4 text-xs font-semibold text-foreground">{entry.amount}</td>

                    <td className="px-5 py-4">
                      <Badge variant={entry.group === "real" ? "success" : "outline"} className="text-[10px]">
                        {entry.group === "real" ? "Real" : "Demo"}
                      </Badge>
                    </td>

                    <td className="px-5 py-4">
                      {entry.mirrored && entry.followers.attempted > 0 ? (
                        <>
                          <p className="text-xs font-semibold text-emerald-300">
                            {entry.followers.placed}/{entry.followers.attempted}
                          </p>
                          {entry.followers.failed > 0 ? (
                            <span className="text-[11px] text-amber-300">{entry.followers.failed} failed</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">{explain(entry)}</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded bg-white/[0.06] px-2 py-1 font-mono text-[11px] text-muted-foreground">
                        {entry.tradeId.length > 14 ? `${entry.tradeId.slice(0, 14)}…` : entry.tradeId}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages}>
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
