"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { AdminOlympPartnerUsers } from "@/components/admin/admin-olymp-partner-users";
import { makeQueryClient } from "@/lib/query-client";

export function OlympPartnerClient() {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AdminOlympPartnerUsers />
    </QueryClientProvider>
  );
}
