"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { api } from "@/lib/api";

const PLAN_RANK: Record<string, number> = { NONE: 0, STANDARD: 1, PRO: 2, VIP: 3 };

/**
 * Returns feature-access flags derived from BOTH the JWT session and the live
 * backend profile.  We always pick the highest-rank plan so that users who
 * just paid don't have to log out / log in to unlock features.
 */
export function useFeatureAccess() {
  const { data: session } = useSession();
  const sessionPlan = session?.user?.plan ?? "NONE";

  // Live profile fetch — 60 s stale window is fine; invalidated on nav.
  const { data: profile } = useQuery({
    queryKey: ["feature-access-profile"],
    queryFn: async () => (await api.get("/user/profile")).data,
    enabled: !!session,
    staleTime: 60_000,
    gcTime: 120_000,
  });

  const rawLivePlan = profile?.subscription?.active
    ? (profile?.subscription?.plan ?? "NONE")
    : "NONE";

  // Pick the higher-ranked plan between session and live data.
  const livePlan = String(rawLivePlan).trim().toUpperCase();
  const plan =
    (PLAN_RANK[livePlan] ?? 0) > (PLAN_RANK[sessionPlan] ?? 0)
      ? livePlan
      : sessionPlan;

  const rank = PLAN_RANK[plan] ?? 0;

  return {
    plan,
    isPro: rank >= PLAN_RANK.PRO,
    isVip: rank >= PLAN_RANK.VIP,
    hasSubscription: rank > PLAN_RANK.NONE,
    isAdmin: session?.user?.role === "admin",
    profileLoaded: profile !== undefined,
  };
}