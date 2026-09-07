"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, CheckCircle2, Info, Loader2, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface OlympPartnerAccountSummary {
  id: number;
  type: "real" | "demo";
  currency: string;
  balance: number;
}

interface OlympPartnerStatus {
  linked: boolean;
  olympUserId?: number;
  createdAt?: string;
  accounts?: OlympPartnerAccountSummary[];
  accountsError?: string;
}

/** Olymp SSO links are one-time and expire in 5 minutes, so they're fetched at click time, never cached. */
type SsoTarget = "/payin" | "/trading";

export function OlympPartnerAccount() {
  const queryClient = useQueryClient();
  const [pendingTarget, setPendingTarget] = useState<SsoTarget | null>(null);

  const { data: status, isLoading } = useQuery<OlympPartnerStatus>({
    queryKey: ["olymp-partner-status"],
    queryFn: async () => (await api.get("/olymp-partner/status")).data as OlympPartnerStatus,
    refetchInterval: 60_000,
  });

  const createAccount = useMutation({
    mutationFn: async () => (await api.post("/olymp-partner/account")).data,
    onSuccess: () => {
      toast.success("Your Olymp Trade account is ready.");
      void queryClient.invalidateQueries({ queryKey: ["olymp-partner-status"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openSso = useMutation({
    mutationFn: async (path: SsoTarget) => (await api.post("/olymp-partner/sso-link", { path })).data as { url: string },
    onMutate: (path: SsoTarget) => setPendingTarget(path),
    onSettled: () => setPendingTarget(null),
    onSuccess: (data) => {
      // Opened in a new tab so the user keeps their NOJAI dashboard.
      window.open(data.url, "_blank", "noopener,noreferrer");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const accounts = status?.accounts ?? [];
  const realAccount = accounts.find((account) => account.type === "real");

  return (
    <div className="dashboard-solid-panel rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Image
          src="/autobot-assets/olymptrade.jpeg"
          alt="Olymp Trade"
          width={28}
          height={28}
          className="h-7 w-7 rounded-lg object-contain"
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold tracking-tight">Your Olymp Trade account</h2>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Created and managed through NOJAI — no Olymp password needed.
          </p>
        </div>
        {status?.linked ? (
          <Badge className="border-emerald-500/20 bg-emerald-500/15 text-emerald-300">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Connected
          </Badge>
        ) : null}
      </div>

      {isLoading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking your account…
        </div>
      ) : !status?.linked ? (
        <div className="mt-6">
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-4">
            <div className="flex gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
              <div className="text-sm leading-6 text-muted-foreground">
                We&apos;ll create your Olymp Trade account for you in one click. No forms, no password to
                remember, and your deposit always goes to your own account — never to NOJAI.
              </div>
            </div>
          </div>

          <Button
            onClick={() => createAccount.mutate()}
            disabled={createAccount.isPending}
            className="mt-4 w-full bg-blue-600 text-white hover:bg-blue-500 sm:w-auto"
          >
            {createAccount.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating your account…
              </>
            ) : (
              <>
                Create my Olymp account
                <ArrowUpRight className="ml-1.5 h-4 w-4" />
              </>
            )}
          </Button>

          {createAccount.isError ? (
            <div className="mt-3 flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs leading-5 text-amber-200/90">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {(createAccount.error as Error).message}
                {(createAccount.error as Error).message.toLowerCase().includes("already exists")
                  ? " If that's your own Olymp account, connect it from the main NOJAI dashboard instead."
                  : null}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {accounts.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {account.type === "real" ? "Real balance" : "Demo balance"}
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold">
                    {formatCurrency(account.balance, account.currency)}
                  </p>
                </div>
              ))}
            </div>
          ) : status.accountsError ? (
            <p className="text-xs text-muted-foreground">
              Couldn&apos;t load your balance right now. Your account is still connected.
            </p>
          ) : null}

          {realAccount && realAccount.balance <= 0 ? (
            <div className="flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs leading-5 text-amber-200/90">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Make a deposit to start trading. The money stays in your Olymp account.</span>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => openSso.mutate("/payin")}
              disabled={openSso.isPending}
              className="bg-blue-600 text-white hover:bg-blue-500"
            >
              {pendingTarget === "/payin" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="mr-2 h-4 w-4" />
              )}
              Deposit
            </Button>
            <Button
              variant="outline"
              onClick={() => openSso.mutate("/trading")}
              disabled={openSso.isPending}
            >
              {pendingTarget === "/trading" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpRight className="mr-2 h-4 w-4" />
              )}
              Open Olymp Trade
            </Button>
          </div>

          <p className="text-[11px] leading-5 text-muted-foreground">
            These open Olymp already logged in — you never need an Olymp password.
          </p>
        </div>
      )}
    </div>
  );
}
