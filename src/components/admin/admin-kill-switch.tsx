"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertOctagon, Loader2, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";

type TradingBroker = "iq" | "eo" | "olymp" | "mt5";
type BinaryStrategyTarget = "pro" | "vip" | "eo-pro" | "eo-vip" | "olymp-pro" | "olymp-vip";

interface KillSwitchState {
  global: boolean;
  brokers: Record<TradingBroker, boolean>;
  strategies: Record<BinaryStrategyTarget, boolean>;
  updatedAt?: string;
  updatedBy?: string;
}

interface PausedUser {
  _id: string;
  email: string;
  fullName?: string;
  tradingPaused: boolean;
  tradingPausedReason?: string;
}

const BROKER_LABELS: Record<TradingBroker, string> = { iq: "IQ Option", eo: "Expert Option", olymp: "Olymp Trade", mt5: "MetaTrader 5" };
const STRATEGY_LABELS: Record<BinaryStrategyTarget, string> = {
  pro: "IQ Option — Pro",
  vip: "IQ Option — VIP",
  "eo-pro": "Expert Option — Pro",
  "eo-vip": "Expert Option — VIP",
  "olymp-pro": "Olymp Trade — Pro",
  "olymp-vip": "Olymp Trade — VIP",
};

export function AdminKillSwitch() {
  const queryClient = useQueryClient();
  const [confirmGlobal, setConfirmGlobal] = useState(false);
  const [search, setSearch] = useState("");
  const [pauseReason, setPauseReason] = useState("");
  const [targetingUserId, setTargetingUserId] = useState<string | null>(null);

  const { data: state, isLoading } = useQuery<KillSwitchState>({
    queryKey: ["admin-kill-switch"],
    queryFn: async () => (await api.get("/admin/kill-switch")).data,
  });

  const { data: usersData, isFetching: loadingUsers } = useQuery<{ users: PausedUser[] }>({
    queryKey: ["admin-kill-switch-users", search],
    queryFn: async () => (await api.get("/admin/kill-switch/users", { params: search ? { search } : { pausedOnly: "true" } })).data,
  });

  const setGlobal = useMutation({
    mutationFn: async (paused: boolean) => (await api.put("/admin/kill-switch/global", { paused })).data,
    onSuccess: (data) => {
      queryClient.setQueryData(["admin-kill-switch"], data);
      toast.success(data.global ? "ALL trading halted platform-wide" : "Global kill switch cleared — trading resumed");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update global kill switch"),
  });

  const setBroker = useMutation({
    mutationFn: async ({ broker, paused }: { broker: TradingBroker; paused: boolean }) =>
      (await api.put(`/admin/kill-switch/broker/${broker}`, { paused })).data,
    onSuccess: (data) => queryClient.setQueryData(["admin-kill-switch"], data),
    onError: (err: Error) => toast.error(err.message || "Failed to update broker kill switch"),
  });

  const setStrategy = useMutation({
    mutationFn: async ({ strategy, paused }: { strategy: BinaryStrategyTarget; paused: boolean }) =>
      (await api.put(`/admin/kill-switch/strategy/${strategy}`, { paused })).data,
    onSuccess: (data) => queryClient.setQueryData(["admin-kill-switch"], data),
    onError: (err: Error) => toast.error(err.message || "Failed to update strategy kill switch"),
  });

  const setUserPause = useMutation({
    mutationFn: async ({ userId, paused, reason }: { userId: string; paused: boolean; reason?: string }) =>
      (await api.put(`/admin/kill-switch/users/${userId}`, { paused, reason })).data,
    onSuccess: () => {
      toast.success("Updated");
      setTargetingUserId(null);
      setPauseReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-kill-switch-users"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update user"),
  });

  if (isLoading || !state) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmGlobal}
        onOpenChange={setConfirmGlobal}
        title="Halt ALL trading platform-wide?"
        description="This immediately stops every broker (IQ Option, Expert Option, Olymp Trade, MT5) from placing any new trade for any user, regardless of subscription or account. Existing open positions are not affected — only new executions are blocked. You can turn it back off instantly."
        confirmLabel="Yes, halt everything"
        destructive
        loading={setGlobal.isPending}
        onConfirm={() => {
          setGlobal.mutate(true);
          setConfirmGlobal(false);
        }}
      />

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-red-400">Emergency Controls</p>
        <h1 className="font-display text-3xl font-bold text-foreground">Trading Kill Switch</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Instantly stop trade execution — platform-wide, per broker, per strategy, or for a single account. Every switch here is fully reversible and takes effect on the next signal (within seconds).
        </p>
      </div>

      {/* Global kill switch — the big red button */}
      <Card className={state.global ? "border-red-500/50 bg-red-500/[0.06]" : ""}>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {state.global ? (
              <AlertOctagon className="h-10 w-10 shrink-0 text-red-400" />
            ) : (
              <ShieldCheck className="h-10 w-10 shrink-0 text-emerald-400" />
            )}
            <div>
              <p className="text-lg font-bold text-foreground">
                {state.global ? "ALL TRADING IS HALTED" : "Trading is live"}
              </p>
              <p className="text-sm text-muted-foreground">
                {state.global
                  ? "No broker will place new trades until this is turned off."
                  : "Everything is running normally across all brokers."}
              </p>
              {state.updatedBy ? (
                <p className="mt-1 text-xs text-muted-foreground/70">Last changed by {state.updatedBy}</p>
              ) : null}
            </div>
          </div>
          <Button
            variant={state.global ? "outline" : "danger"}
            size="lg"
            onClick={() => {
              if (state.global) {
                setGlobal.mutate(false);
              } else {
                setConfirmGlobal(true);
              }
            }}
            disabled={setGlobal.isPending}
            className="shrink-0 gap-2"
          >
            <AlertOctagon className="h-4 w-4" />
            {state.global ? "Resume all trading" : "HALT ALL TRADING"}
          </Button>
        </CardContent>
      </Card>

      {/* Per-broker */}
      <Card>
        <CardHeader>
          <CardTitle>Per-Broker Switches</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(BROKER_LABELS) as TradingBroker[]).map((broker) => (
            <div
              key={broker}
              className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${state.brokers[broker] ? "border-red-500/40 bg-red-500/[0.05]" : "border-border bg-muted/20"}`}
            >
              <div>
                <p className="font-semibold">{BROKER_LABELS[broker]}</p>
                <p className="text-xs text-muted-foreground">{state.brokers[broker] ? "Paused" : "Active"}</p>
              </div>
              <Switch
                checked={!state.brokers[broker]}
                onCheckedChange={(enabled) => setBroker.mutate({ broker, paused: !enabled })}
                disabled={setBroker.isPending || state.global}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Per-strategy (binary tiers only — MT5 strategies already have their own admin toggle) */}
      <Card>
        <CardHeader>
          <CardTitle>Per-Strategy Switches</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(STRATEGY_LABELS) as BinaryStrategyTarget[]).map((strategy) => (
            <div
              key={strategy}
              className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${state.strategies[strategy] ? "border-red-500/40 bg-red-500/[0.05]" : "border-border bg-muted/20"}`}
            >
              <div>
                <p className="font-semibold">{STRATEGY_LABELS[strategy]}</p>
                <p className="text-xs text-muted-foreground">{state.strategies[strategy] ? "Paused" : "Active"}</p>
              </div>
              <Switch
                checked={!state.strategies[strategy]}
                onCheckedChange={(enabled) => setStrategy.mutate({ strategy, paused: !enabled })}
                disabled={setStrategy.isPending || state.global}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Per-user isolation */}
      <Card>
        <CardHeader>
          <CardTitle>Isolate a Specific Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Instantly stop trading for one user's account — across every broker — without touching anyone else. Useful for a compromised or targeted account.
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by email or name (leave blank to see currently-paused accounts)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            {loadingUsers ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Searching...</p>
            ) : (usersData?.users ?? []).length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                {search ? "No matching users." : "No accounts are currently paused."}
              </p>
            ) : (
              (usersData?.users ?? []).map((u) => (
                <div key={u._id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">{u.fullName || "Unnamed user"}</p>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                      {u.tradingPaused ? (
                        <Badge variant="warning" className="mt-1 gap-1">
                          <ShieldAlert className="h-3 w-3" /> Paused{u.tradingPausedReason ? `: ${u.tradingPausedReason}` : ""}
                        </Badge>
                      ) : null}
                    </div>
                    {u.tradingPaused ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUserPause.mutate({ userId: u._id, paused: false })}
                        disabled={setUserPause.isPending}
                      >
                        Resume trading
                      </Button>
                    ) : targetingUserId === u._id ? (
                      <div className="flex flex-1 gap-2 sm:max-w-sm">
                        <Input
                          placeholder="Reason (optional)"
                          value={pauseReason}
                          onChange={(e) => setPauseReason(e.target.value)}
                        />
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setUserPause.mutate({ userId: u._id, paused: true, reason: pauseReason })}
                          disabled={setUserPause.isPending}
                        >
                          Confirm
                        </Button>
                      </div>
                    ) : (
                      <Button variant="danger" size="sm" onClick={() => setTargetingUserId(u._id)}>
                        Pause this account
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
