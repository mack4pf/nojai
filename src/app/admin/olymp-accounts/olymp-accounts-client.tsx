"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { AdminOlympAccountsManager } from "@/components/admin/admin-olymp-accounts-manager";
import { AdminOlympLiveTrades } from "@/components/admin/admin-olymp-live-trades";
import { AdminOlympPartnerTrader } from "@/components/admin/admin-olymp-partner-trader";
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
            Your own Olymp trading account, and everything it trades.
          </p>
        </div>

        {/* The current way an account is linked: created or claimed through the
            Partner API, with no token to paste. Trading lives here. */}
        <AdminOlympPartnerTrader />

        <div className="border-t border-white/[0.06]" />

        {/* The older token-connected accounts. Still supported — an account
            linked this way keeps working — but not how a new one is added. */}
        <details className="group">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Token-connected accounts (older method)
          </summary>
          <div className="mt-4">
            <AdminOlympAccountsManager />
          </div>
        </details>

        <div className="border-t border-white/[0.06]" />

        <AdminOlympLiveTrades />
      </div>
    </QueryClientProvider>
  );
}
