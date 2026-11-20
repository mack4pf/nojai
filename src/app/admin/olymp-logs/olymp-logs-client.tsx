"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { AdminOlympLogs } from "@/components/admin/admin-olymp-logs";
import { makeQueryClient } from "@/lib/query-client";

export function OlympLogsClient() {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Olymp logs</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Every trade placed from the Olymp panel and what reached the followers. Kept in the
            database, so unlike the live feed it survives a restart.
          </p>
        </div>

        <AdminOlympLogs />
      </div>
    </QueryClientProvider>
  );
}
