"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { AdminOlympFree } from "@/components/admin/admin-olymp-free";
import { AdminOlympPerformance } from "@/components/admin/admin-olymp-performance";
import { makeQueryClient } from "@/lib/query-client";

export function OlympFreeClient() {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <div className="space-y-6">
        <AdminOlympPerformance />
        <AdminOlympFree />
      </div>
    </QueryClientProvider>
  );
}
