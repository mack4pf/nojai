"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, normalizeUserProfile } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { UserProfile } from "@/types";
import { ProfileSettingsForm } from "@/components/dashboard/profile-settings-form";
import { VipMartingaleSettings } from "@/components/dashboard/vip-martingale-settings";
import { MetaTrader5Icon } from "@/components/icons/metatrader5-icon";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const PLAN_RANK: Record<string, number> = { NONE: 0, STANDARD: 1, PRO: 2, VIP: 3 };

interface Mt5AccountSummary {
  _id: string;
  brokerName: string;
  login: string;
  blockGlobalSignals: boolean;
  status: string;
}

function Mt5SignalPreferences() {
  const queryClient = useQueryClient();
  const [confirmAccount, setConfirmAccount] = useState<Mt5AccountSummary | null>(null);

  const { data: accounts = [] } = useQuery({
    queryKey: queryKeys.mt5Accounts,
    queryFn: async () => {
      const res = await api.get("/mt5/accounts");
      return (res.data?.accounts ?? []) as Mt5AccountSummary[];
    },
  });

  const blockMutation = useMutation({
    mutationFn: async ({ accountId, blockGlobalSignals }: { accountId: string; blockGlobalSignals: boolean }) => {
      await api.patch(`/mt5/accounts/${accountId}/settings`, { blockGlobalSignals });
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.blockGlobalSignals ? "Nojai signals blocked for this account" : "Nojai signals enabled");
      queryClient.invalidateQueries({ queryKey: queryKeys.mt5Accounts });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update signal preference");
    },
  });

  const active = accounts.filter((a) => a.status !== "disconnected");
  if (active.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#59c7f9]/25 bg-[#59c7f9]/10">
          <MetaTrader5Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold sm:text-base">MT5 Signal Preferences</h2>
          <p className="text-[11px] text-muted-foreground sm:text-xs">Control which accounts receive Nojai global signals.</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {active.map((account) => (
          <div key={account._id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div className="min-w-0 flex-1 pr-4">
              <p className="truncate text-sm font-medium">{account.brokerName}</p>
              <p className="text-[11px] text-muted-foreground">Login: {account.login}</p>
              <p className={`mt-0.5 text-[10px] font-semibold ${account.blockGlobalSignals ? "text-amber-500" : "text-emerald-500"}`}>
                {account.blockGlobalSignals ? "Own signals only" : "Receiving Nojai signals"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={account.blockGlobalSignals}
              aria-label={`Block Nojai signals for ${account.brokerName}`}
              disabled={blockMutation.isPending}
              onClick={() => {
                if (!account.blockGlobalSignals) {
                  setConfirmAccount(account);
                } else {
                  blockMutation.mutate({ accountId: account._id, blockGlobalSignals: false });
                }
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 ${
                account.blockGlobalSignals
                  ? "bg-amber-500 focus-visible:ring-amber-500"
                  : "bg-black/20 dark:bg-white/20 focus-visible:ring-black/30"
              }`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-1 ring-black/10 transition-transform ${
                account.blockGlobalSignals ? "translate-x-5" : "translate-x-0.5"
              }`} />
            </button>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground sm:text-[11px]">
        When enabled, this account only trades signals sent to its personal webhook URL.
      </p>

      <ConfirmDialog
        open={Boolean(confirmAccount)}
        title="Use your own signals only?"
        description={`Turning this on means Nojai global signals will be blocked for ${confirmAccount?.brokerName ?? "this account"}. Only signals sent directly to this account's personal webhook will be auto-traded. You can turn it back on at any time.`}
        confirmLabel="Yes, use my own signals"
        cancelLabel="Cancel"
        loading={blockMutation.isPending}
        onOpenChange={(open) => !open && setConfirmAccount(null)}
        onConfirm={() => {
          if (confirmAccount) {
            blockMutation.mutate({ accountId: confirmAccount._id, blockGlobalSignals: true });
            setConfirmAccount(null);
          }
        }}
      />
    </div>
  );
}

export function SettingsForm() {
  const { data: profile } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () =>
      normalizeUserProfile((await api.get("/user/profile")).data) as UserProfile | null,
  });

  const plan = profile?.subscription?.plan ?? "NONE";
  const rank = PLAN_RANK[plan] ?? 0;
  const canCustomizeMartingale = rank >= PLAN_RANK.PRO;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Settings</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Manage your profile and account preferences.
        </p>
      </div>

      {/* Profile */}
      <ProfileSettingsForm />

      {/* MT5 Signal Preferences */}
      <Mt5SignalPreferences />

      {/* Martingale */}
      {canCustomizeMartingale && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
          <VipMartingaleSettings />
        </div>
      )}
    </div>
  );
}

