"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { WebhookCard } from "@/components/dashboard/webhook-card";
import { Mt5WebhookSection } from "@/components/dashboard/mt5-webhook-section";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api, normalizeUserProfile } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { UserProfile } from "@/types";

export function DashboardWebhookPage() {
  const { data: profile } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => normalizeUserProfile((await api.get("/user/profile")).data) as UserProfile | null,
  });

  const { isVip, isPro } = useFeatureAccess();
  const hasAccess = isVip || isPro;

  const hasBinary = Boolean(profile?.subscription?.access?.binary);
  const hasForex = Boolean(profile?.subscription?.access?.forex);
  const hasBoth = hasBinary && hasForex;

  const [activeTab, setActiveTab] = useState<"binary" | "mt5">(hasBinary ? "binary" : "mt5");

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Webhook</h1>
          <p className="mt-1 text-sm text-muted-foreground">Receive external trading signals via webhook.</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <Lock className="mb-3 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">PRO or VIP plan required</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Upgrade to PRO or VIP to get a personal webhook URL for TradingView signals.</p>
          <Button asChild size="sm" variant="outline" className="mt-4">
            <Link href="/dashboard/subscription">View plans</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Single-product users see their webhook directly — no tabs needed
  if (!hasBoth) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Webhook</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Receive trading signals from any platform via a personal webhook URL.
          </p>
        </div>
        {hasForex ? <Mt5WebhookSection /> : <WebhookCard hideTitleHeader />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Webhook</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Receive trading signals from any platform via a personal webhook URL.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1 mt5-outer-panel w-fit">
        {([
          { id: "binary" as const, label: "Binary Options", show: hasBinary },
          { id: "mt5" as const, label: "MT5 AutoTrade", show: hasForex },
        ]).filter((t) => t.show).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-5 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "binary" && <WebhookCard hideTitleHeader />}
      {activeTab === "mt5" && <Mt5WebhookSection />}
    </div>
  );
}

