"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { AdminOlympAccountsManager } from "@/components/admin/admin-olymp-accounts-manager";
import { AdminOlympLiveTrades } from "@/components/admin/admin-olymp-live-trades";
import { makeQueryClient } from "@/lib/query-client";

export function OlympAccountsClient() {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Olymp accounts
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Your own Olymp Trade accounts, and everything they trade. Connect as many as you need.
          </p>
        </div>

        <AdminOlympAccountsManager />

        <div className="border-t border-white/[0.06]" />

        <AdminOlympLiveTrades />
      </div>
    </QueryClientProvider>
  );
}
