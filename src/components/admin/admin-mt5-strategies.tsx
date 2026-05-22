"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Copy, Pencil, RefreshCw, ShieldCheck, TrendingUp, Users, Webhook, X, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Strategy {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  symbol?: string;
  webhookToken: string;
  webhookUrl: string;
  isActive: boolean;
  defaultEnabled: boolean;
  stats: {
    enabledUsers: number;
    signalCount: number;
    tradeCount: number;
    netProfit: number;
    winRate: number;
    recentSignals?: Array<{
      _id: string;
      action?: string;
      symbol?: string;
      status: string;
      rejectReason?: string;
      receivedAt: string;
      rawText?: string;
    }>;
  };
}

function money(value: number) {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AdminMt5Strategies() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("XAUUSD");
  const [symbol, setSymbol] = useState("XAUUSD");
  const [description, setDescription] = useState("Gold strategy webhook");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSymbol, setEditSymbol] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-mt5-strategies"],
    queryFn: async () => (await api.get("/admin/mt5/strategies")).data as { strategies: Strategy[] },
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: async () => api.post("/admin/mt5/strategies", { name, symbol, description, defaultEnabled: true }),
    onSuccess: () => {
      toast.success("MT5 strategy webhook created");
      queryClient.invalidateQueries({ queryKey: ["admin-mt5-strategies"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create strategy"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Pick<Strategy, "isActive" | "defaultEnabled">> }) =>
      api.patch(`/admin/mt5/strategies/${id}`, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-mt5-strategies"] }),
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update strategy"),
  });

  const regenerateMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/admin/mt5/strategies/${id}/regenerate-token`),
    onSuccess: () => {
      toast.success("Webhook token regenerated");
      queryClient.invalidateQueries({ queryKey: ["admin-mt5-strategies"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to regenerate token"),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: { name: string; symbol: string; description: string } }) =>
      api.patch(`/admin/mt5/strategies/${id}`, values),
    onSuccess: () => {
      toast.success("Strategy updated");
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-mt5-strategies"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update strategy"),
  });

  function startEdit(strategy: Strategy) {
    setEditingId(strategy._id);
    setEditName(strategy.name);
    setEditSymbol(strategy.symbol ?? "");
    setEditDescription(strategy.description ?? "");
  }

  const strategies = data?.strategies ?? [];

  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-[32px] border border-border bg-card p-6 shadow-glow sm:p-8">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              <Webhook className="h-3.5 w-3.5" />
              MT5 strategy webhooks
            </div>
            <h1 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">Strategy monitor</h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Create named global MT5 webhook tokens, track usage, and compare which strategies are profitable.
            </p>
          </div>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-mt5-strategies"] })} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-border bg-card p-5 2xl:sticky 2xl:top-6 2xl:self-start">
          <h2 className="font-semibold">Create webhook</h2>
          <p className="mt-1 text-sm text-muted-foreground">Generate a new global strategy token users can opt into.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-1">
            <input value={name} onChange={(e) => setName(e.target.value)} className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm" placeholder="Strategy name" />
            <input value={symbol} onChange={(e) => setSymbol(e.target.value)} className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm" placeholder="Symbol, e.g. XAUUSD" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm md:col-span-2 2xl:col-span-1" placeholder="Description" />
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !name.trim()} className="w-full gap-2 md:col-span-2 2xl:col-span-1">
              <Zap className="h-4 w-4" />
              Generate webhook
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">Loading strategies...</div>
          ) : strategies.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">No MT5 strategies yet.</div>
          ) : (
            strategies.map((strategy) => {
              const isEditing = editingId === strategy._id;
              return (
              <article key={strategy._id} className="rounded-3xl border border-border bg-card p-4 sm:p-5">
                <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-10 w-full rounded-2xl border border-border bg-background px-4 text-sm font-semibold"
                          placeholder="Strategy name"
                        />
                        <input
                          value={editSymbol}
                          onChange={(e) => setEditSymbol(e.target.value)}
                          className="h-10 w-full rounded-2xl border border-border bg-background px-4 text-sm"
                          placeholder="Symbol, e.g. XAUUSD"
                        />
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="min-h-20 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                          placeholder="Description"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => editMutation.mutate({ id: strategy._id, values: { name: editName, symbol: editSymbol, description: editDescription } })}
                            disabled={editMutation.isPending || !editName.trim()}
                          >
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">{strategy.name}</h3>
                          <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", strategy.isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-muted text-muted-foreground")}>
                            {strategy.isActive ? "Active" : "Paused"}
                          </span>
                          {strategy.symbol ? <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{strategy.symbol}</span> : null}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{strategy.description || "No description"}</p>
                      </>
                    )}
                    {!isEditing && (
                      <div className="mt-4 rounded-2xl border border-border bg-background/60 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Webhook URL</p>
                        <div className="mt-2 flex items-start gap-2">
                          <code className="min-w-0 flex-1 break-all text-xs leading-5 text-foreground">{strategy.webhookUrl}</code>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              navigator.clipboard.writeText(strategy.webhookUrl);
                              toast.success("Webhook copied");
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => startEdit(strategy)}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => toggleMutation.mutate({ id: strategy._id, values: { isActive: !strategy.isActive } })}
                      >
                        {strategy.isActive ? "Pause" : "Activate"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => toggleMutation.mutate({ id: strategy._id, values: { defaultEnabled: !strategy.defaultEnabled } })}
                      >
                        Default {strategy.defaultEnabled ? "On" : "Off"}
                      </Button>
                      <Button variant="danger" size="sm" className="col-span-2 w-full sm:col-span-1 sm:w-auto" onClick={() => regenerateMutation.mutate(strategy._id)}>
                        New token
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <Users className="h-4 w-4 text-primary" />
                    <p className="mt-2 text-xl font-bold">{strategy.stats.enabledUsers}</p>
                    <p className="text-xs text-muted-foreground">users enabled</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <Webhook className="h-4 w-4 text-primary" />
                    <p className="mt-2 text-xl font-bold">{strategy.stats.signalCount}</p>
                    <p className="text-xs text-muted-foreground">signals received</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <p className="mt-2 text-xl font-bold">{strategy.stats.tradeCount}</p>
                    <p className="text-xs text-muted-foreground">trades</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <p className={cn("mt-2 text-xl font-bold", strategy.stats.netProfit >= 0 ? "text-emerald-300" : "text-danger")}>{money(strategy.stats.netProfit)}</p>
                    <p className="text-xs text-muted-foreground">net P/L</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <p className="mt-2 text-xl font-bold">{strategy.stats.winRate}%</p>
                    <p className="text-xs text-muted-foreground">win rate</p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-border bg-background/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold">Recent webhook logs</h4>
                    </div>
                    <span className="text-xs text-muted-foreground">{strategy.stats.recentSignals?.length ?? 0} latest</span>
                  </div>
                  {strategy.stats.recentSignals?.length ? (
                    <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
                      {strategy.stats.recentSignals.map((signal) => (
                        <div key={signal._id} className="grid gap-2 bg-card px-3 py-3 text-xs sm:grid-cols-[140px_100px_120px_minmax(0,1fr)] sm:items-center">
                          <span className="text-muted-foreground">{new Date(signal.receivedAt).toLocaleString()}</span>
                          <span className="font-bold text-foreground">{signal.symbol || strategy.symbol || "SIGNAL"}</span>
                          <span className={cn(
                            "w-fit rounded-full px-2 py-1 font-bold uppercase",
                            signal.status === "dispatched" ? "bg-emerald-500/10 text-emerald-400" :
                              signal.status === "rejected" ? "bg-danger/10 text-danger" :
                                "bg-primary/10 text-primary",
                          )}>
                            {signal.action ? `${signal.action} · ` : ""}{signal.status}
                          </span>
                          <span className="min-w-0 truncate text-muted-foreground">
                            {signal.rejectReason || signal.rawText || "Signal received"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                      No signal has been received for this strategy yet.
                    </p>
                  )}
                </div>
              </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
