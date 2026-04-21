"use client";

import { useState } from "react";

import {
  QueryClientProvider,
  type DehydratedState,
} from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

import { makeQueryClient } from "@/lib/query-client";

interface AppProvidersProps {
  children: React.ReactNode;
  dehydratedState?: DehydratedState;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </SessionProvider>
  );
}