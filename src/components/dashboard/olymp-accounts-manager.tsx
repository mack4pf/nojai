"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { OlympPartnerAccount } from "@/components/dashboard/olymp-partner-account";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { OlympAccount } from "@/types";

/**
 * The Olymp section of the main dashboard.
 *
 * Connecting happens on /dashboard/olymp-trade/connect, not here. This page
 * used to carry three ways in — an access token, an Olymp email and password,
 * and the partner flow — plus a separate "submit your details for approval"
 * form. The token and password forms are gone: both asked for a broker
 * credential, and a token lapsed about every 48 hours, which left the account
 * linked but silently unable to trade. The approval step is gone with them,
 * since a partner connection needs nothing approved.
 *
 * Accounts connected the old way are still listed and still manageable, so
 * nobody loses an account they already had. There is just no way to add
 * another one that way.
 */

interface OlympPartnerStatus {
  linked: boolean;
  olympUserId?: number;
}

export function OlympAccountsManager() {
  const queryClient = useQueryClient();

  const { data: partnerStatus, isLoading: partnerLoading } = useQuery<OlympPartnerStatus>({
    queryKey: ["olymp-partner-status"],
    queryFn: async () => (await api.get("/olymp-partner/status")).data as OlympPartnerStatus,
  });

  const { data: legacyAccounts = [], isLoading: legacyLoading } = useQuery<OlympAccount[]>({
    queryKey: queryKeys.olympAccounts,
    queryFn: async () => {
      const res = await api.get("/user/olymp-accounts");
      return (res.data.accounts ?? res.data ?? []) as OlympAccount[];
    },
    // Connection status can change server-side at any time (drops,
    // reconnects) — without polling this only ever reflected whatever was
    // true at page load, so a mid-session disconnect kept showing
    // "connected" until the user manually refreshed.
    refetchInterval: 30_000,
  });

  const [accountToDisconnect, setAccountToDisconnect] = useState<OlympAccount | null>(null);
  const [draftAmounts, setDraftAmounts] = useState<Record<number, number>>({});

  const disconnectMutation = useMutation({
    mutationFn: async (accountId: number) => {
      await api.delete(`/user/olymp-account/${accountId}`);
    },
    onSuccess: () => {
      toast.success("Olymp Trade account disconnected");
      setAccountToDisconnect(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.olympAccounts });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to disconnect account"),
  });

  const refreshMutation = useMutation({
    mutationFn: async (accountId: number) => (await api.post(`/user/olymp-account/${accountId}/refresh-balance`)).data,
    onSuccess: () => {
      toast.success("Balance refresh requested");
      queryClient.invalidateQueries({ queryKey: queryKeys.olympAccounts });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to refresh balance"),
  });

  const baseAmountMutation = useMutation({
    mutationFn: async ({ accountId, nextBaseAmount }: { accountId: number; nextBaseAmount: number }) => {
      await api.patch(`/user/olymp-account/${accountId}/base-amount`, { baseAmount: nextBaseAmount });
    },
    onSuccess: () => {
      toast.success("Base amount updated");
      queryClient.invalidateQueries({ queryKey: queryKeys.olympAccounts });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update base amount"),
  });

  const takeSignalsMutation = useMutation({
    mutationFn: async ({ accountId, takeSignalsEnabled }: { accountId: number; takeSignalsEnabled: boolean }) => {
      await api.patch(`/user/olymp-account/${accountId}/take-signals`, { takeSignalsEnabled });
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.takeSignalsEnabled ? "Olymp signals turned on" : "Olymp signals turned off");
      queryClient.invalidateQueries({ queryKey: queryKeys.olympAccounts });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update Olymp signal setting"),
  });

  const realTradingMutation = useMutation({
    mutationFn: async ({ accountId, enabled }: { accountId: number; enabled: boolean }) => {
      await api.patch(`/user/olymp-account/${accountId}/real-trading`, { enabled });
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.enabled ? "Real-money trading enabled" : "Real-money trading disabled");
      queryClient.invalidateQueries({ queryKey: queryKeys.olympAccounts });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update real-trading setting"),
  });

  const isLinked = Boolean(partnerStatus?.linked);
  const hasLegacy = legacyAccounts.length > 0;

  return (
    <div className="space-y-4">
      <div className="dashboard-solid-panel flex flex-col gap-2 rounded-2xl border border-emerald-500/25 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Olymp Trade</h2>
          <p className="text-[11px] text-muted-foreground">
            {isLinked
              ? `Connected · account #${partnerStatus?.olympUserId}`
              : "Connect your Olymp account to start"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isLinked ? "success" : "secondary"}>{isLinked ? "Active" : "Not connected"}</Badge>
          {isLinked ? null : (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href="/dashboard/olymp-trade/connect">
                <Plus className="h-3.5 w-3.5" /> Connect
              </Link>
            </Button>
          )}
        </div>
      </div>

      {partnerLoading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your Olymp account…
        </div>
      ) : isLinked ? (
        <OlympPartnerAccount />
      ) : (
        /* The whole connect flow lives on its own page now, so this is a door
           rather than a form. Everything a user has to read before connecting
           — which accounts can be linked, the bonus code, the deposit minimum
           — is there with it. */
        <div className="dashboard-solid-panel rounded-2xl border border-emerald-500/25 bg-white/[0.02] p-5 sm:p-6">
          <h3 className="font-display text-lg font-semibold tracking-tight">Connect your Olymp account</h3>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground sm:text-sm">
            Link the Olymp account you already have, or let us open one for you. No Olymp password is
            needed either way, and nothing expires once it is connected.
          </p>
          <Button asChild className="mt-4 gap-2">
            <Link href="/dashboard/olymp-trade/connect">
              Connect Olymp account <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}

      {/* Older token and password connections. Listed only while they exist —
          there is no path to create another. */}
      {legacyLoading ? null : hasLegacy ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] p-3 text-[11px] leading-5 text-amber-100">
            <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              {hasLegacy && legacyAccounts.length === 1 ? "This account was" : "These accounts were"} connected
              with an access token or your Olymp password, which we no longer support. It keeps working for
              now, but Olymp ends those sessions roughly every 48 hours and we cannot renew them.{" "}
              <Link href="/dashboard/olymp-trade/connect" className="font-semibold text-foreground underline">
                Reconnect by account ID
              </Link>{" "}
              to stop that happening.
            </p>
          </div>

          {legacyAccounts.map((account) => {
            const draftBaseAmount = draftAmounts[account.accountId] ?? account.baseAmount;
            return (
              <div key={account.accountId} className="dashboard-solid-panel space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{account.name || account.email || `Olymp #${account.accountId}`}</p>
                    <p className="text-[11px] text-muted-foreground">ID: {account.accountId} · {account.accountGroup}</p>
                  </div>
                  <Badge variant={account.needsReauth ? "destructive" : account.status === "connected" ? "success" : "warning"}>
                    {account.needsReauth ? "reconnect needed" : account.status}
                  </Badge>
                </div>

                {account.needsReauth && (
                  // A lapsed Olymp session cannot recover on its own, so this
                  // has to read as an action the user must take, not as the
                  // transient "disconnected" it used to be shown as. The only
                  // offer now is the connection that does not expire.
                  <div className="rounded-xl border border-destructive/40 bg-destructive/[0.08] p-3">
                    <p className="text-xs font-semibold text-destructive">Your Olymp session has expired</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Olymp signs these sessions out roughly every 48 hours and we cannot renew one for you.
                      This account is still linked but <span className="font-semibold">cannot place trades</span>.
                    </p>
                    <Button asChild size="sm" variant="outline" className="mt-2 gap-1.5">
                      <Link href="/dashboard/olymp-trade/connect">
                        Reconnect by account ID <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="dashboard-solid-panel rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Balance</p>
                    <p className="mt-1 font-display text-base font-semibold">{formatCurrency(account.balance ?? 0, account.currency ?? "USD")}</p>
                  </div>
                  <div className="dashboard-solid-panel rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Base Amount</p>
                    <p className="mt-1 text-sm font-semibold">{formatCurrency(account.baseAmount, account.currency ?? "USD")}</p>
                  </div>
                  <div className="dashboard-solid-panel rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Mode</p>
                    <p className="mt-1 text-sm font-semibold">{account.accountGroup === "real" ? "Real" : "Demo"}</p>
                  </div>
                  <div className="dashboard-solid-panel rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Last Connected</p>
                    <p className="mt-1 text-xs font-semibold">{account.lastConnected ? formatDate(account.lastConnected) : "-"}</p>
                  </div>
                </div>

                {account.accountGroup === "real" && (
                  <div className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${account.realTradingEnabled ? "border-emerald-500/30 bg-emerald-500/[0.06]" : "border-warning/40 bg-warning/[0.06]"}`}>
                    <div>
                      <p className="text-xs font-semibold">
                        {account.realTradingEnabled ? "Real-money auto-trading is ON" : "Real-money auto-trading is OFF"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {account.realTradingEnabled
                          ? "Signals will place real trades on this account."
                          : "This account is REAL — enable this to let signals place real trades."}
                      </p>
                    </div>
                    <Switch
                      checked={Boolean(account.realTradingEnabled)}
                      onCheckedChange={(enabled) => realTradingMutation.mutate({ accountId: account.accountId, enabled })}
                      disabled={realTradingMutation.isPending}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 border-t border-white/5 pt-3 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Base Amount</Label>
                    <Input
                      type="number"
                      min={1}
                      value={draftBaseAmount}
                      onChange={(event) => setDraftAmounts((prev) => ({ ...prev, [account.accountId]: Number(event.target.value) }))}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => baseAmountMutation.mutate({ accountId: account.accountId, nextBaseAmount: draftBaseAmount })}
                      disabled={baseAmountMutation.isPending || draftBaseAmount < 1}
                    >
                      Save Amount
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Label htmlFor={`olymp-signals-${account.accountId}`} className="text-xs font-semibold">Take Signals</Label>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {account.takeSignalsEnabled ?? true ? "This account will place trades when Olymp signals arrive." : "This account will skip Olymp signals until you turn this back on."}
                    </p>
                  </div>
                  <Switch
                    id={`olymp-signals-${account.accountId}`}
                    checked={account.takeSignalsEnabled ?? true}
                    onCheckedChange={(checked) => takeSignalsMutation.mutate({ accountId: account.accountId, takeSignalsEnabled: checked })}
                    disabled={takeSignalsMutation.isPending}
                  />
                </div>

                <div className="flex flex-wrap gap-2 border-t border-white/5 pt-3">
                  <Button variant="outline" size="sm" onClick={() => refreshMutation.mutate(account.accountId)} disabled={refreshMutation.isPending}>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh Balance
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setAccountToDisconnect(account)} disabled={disconnectMutation.isPending}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Disconnect
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(accountToDisconnect)}
        onOpenChange={(open) => { if (!open) setAccountToDisconnect(null); }}
        title="Disconnect Olymp Trade account?"
        description={`Disconnect ${accountToDisconnect?.name || accountToDisconnect?.email || "this account"} from your bot.`}
        confirmLabel="Disconnect"
        destructive
        loading={disconnectMutation.isPending}
        onConfirm={() => {
          if (accountToDisconnect) disconnectMutation.mutate(accountToDisconnect.accountId);
        }}
      />
    </div>
  );
}
