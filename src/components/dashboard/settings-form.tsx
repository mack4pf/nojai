"use client";

import { useQuery } from "@tanstack/react-query";
import { api, normalizeUserProfile } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { UserProfile } from "@/types";
import { ProfileSettingsForm } from "@/components/dashboard/profile-settings-form";
import { VipMartingaleSettings } from "@/components/dashboard/vip-martingale-settings";

const PLAN_RANK: Record<string, number> = { NONE: 0, STANDARD: 1, PRO: 2, VIP: 3 };

export function SettingsForm() {
  const { data: profile } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () =>
      normalizeUserProfile((await api.get("/user/profile")).data) as UserProfile | null,
  });

  const plan = profile?.subscription?.plan ?? "NONE";
  const rank = PLAN_RANK[plan] ?? 0;
  const isVip = rank >= PLAN_RANK.VIP;

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

      {/* VIP Martingale */}
      {isVip && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
          <VipMartingaleSettings />
        </div>
      )}
    </div>
  );
}
