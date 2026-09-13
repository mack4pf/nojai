"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, CheckCircle2, Info, Loader2, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  email?: string;
  suggestedEmail?: string;
  createdAt?: string;
  tradingEnabled?: boolean;
  /** Which balance the bot trades. Defaults to demo until the user opts into real money. */
  accountGroup?: "real" | "demo";
  baseAmount?: number;
  accounts?: OlympPartnerAccountSummary[];
  accountsError?: string;
}

/** Olymp's main markets — the value is the ISO 3166-1 alpha-2 code they expect. */
const COUNTRIES = [
  { code: "NG", label: "Nigeria" },
  { code: "GH", label: "Ghana" },
  { code: "KE", label: "Kenya" },
  { code: "ZA", label: "South Africa" },
  { code: "CM", label: "Cameroon" },
  { code: "TZ", label: "Tanzania" },
  { code: "UG", label: "Uganda" },
  { code: "IN", label: "India" },
  { code: "PK", label: "Pakistan" },
  { code: "ID", label: "Indonesia" },
  { code: "BD", label: "Bangladesh" },
  { code: "EG", label: "Egypt" },
  { code: "BR", label: "Brazil" },
  { code: "MX", label: "Mexico" },
  { code: "TR", label: "Turkey" },
];

/**
 * Olymp refuses throwaway email providers at registration, and only says so
 * with a generic error that names no field. Flagging the common ones here
 * gives immediate feedback; the server enforces the same rule.
 */
const DISPOSABLE_DOMAINS = new Set([
  "yopmail.com", "yopmail.fr", "yopmail.net", "mailinator.com", "guerrillamail.com",
  "sharklasers.com", "grr.la", "10minutemail.com", "tempmail.com", "temp-mail.org",
  "tempmailo.com", "minuteinbox.com", "throwawaymail.com", "fakeinbox.com", "trashmail.com",
  "getnada.com", "dispostable.com", "maildrop.cc", "mailnesia.com", "emailondeck.com",
  "mohmal.com", "moakt.com", "tempr.email", "discard.email", "mailcatch.com", "mail.tm",
]);

function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

/** Olymp SSO links are one-time and expire in 5 minutes, so they're fetched at click time, never cached. */
type SsoTarget = "/payin" | "/trading";

export function OlympPartnerAccount() {
  const queryClient = useQueryClient();
  const [pendingTarget, setPendingTarget] = useState<SsoTarget | null>(null);
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("NG");
  const [amount, setAmount] = useState("");

  const { data: status, isLoading } = useQuery<OlympPartnerStatus>({
    queryKey: ["olymp-partner-status"],
    queryFn: async () => (await api.get("/olymp-partner/status")).data as OlympPartnerStatus,
    refetchInterval: 60_000,
  });

  const createAccount = useMutation({
    mutationFn: async (payload: { email: string; country: string }) =>
      (await api.post("/olymp-partner/account", payload)).data,
    onSuccess: () => {
      toast.success("Your Olymp Trade account is ready.");
      void queryClient.invalidateQueries({ queryKey: ["olymp-partner-status"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateSettings = useMutation({
    mutationFn: async (payload: { tradingEnabled?: boolean; baseAmount?: number; accountGroup?: "real" | "demo" }) =>
      (await api.patch("/olymp-partner/settings", payload)).data,
    onSuccess: (_data, variables) => {
      if (variables.accountGroup) {
        // Moving to real money deserves a blunter confirmation than a
        // settings-saved nudge -- it changes whose money is at stake.
        toast.success(
          variables.accountGroup === "real"
            ? "Switched to real money. The bot will now trade your deposited funds."
            : "Switched to practice. The bot will trade your demo balance only.",
        );
      } else if (variables.tradingEnabled === undefined) {
        toast.success("Trade amount saved.");
      } else {
        toast.success(variables.tradingEnabled ? "Automated trading is on." : "Automated trading is off.");
      }
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
  // The bot trades whichever balance is selected, so that's the one whose
  // funding state the page should be reacting to -- warning about an empty
  // real balance while the bot is on demo would be noise.
  const activeGroup: "real" | "demo" = status?.accountGroup === "real" ? "real" : "demo";
  const activeAccount = accounts.find((account) => account.type === activeGroup);
  const isReal = activeGroup === "real";
  // Falls back to the suggested address until the user types their own, so a
  // background refetch can't clobber what they've entered.
  const emailValue = email || status?.suggestedEmail || "";
  const emailIsDisposable = emailValue.includes("@") && isDisposableEmail(emailValue);
  // Falls back to the saved amount until edited, so a refetch can't wipe typing.
  const amountValue = amount !== "" ? amount : String(status?.baseAmount ?? 1);

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

          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createAccount.mutate({ email: emailValue.trim(), country });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
              <div>
                <Label htmlFor="olymp-email" className="text-xs">Email for your Olymp account</Label>
                <Input
                  id="olymp-email"
                  type="email"
                  required
                  value={emailValue}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="mt-1.5"
                />
                {emailIsDisposable ? (
                  <p className="mt-1.5 text-[11px] leading-4 text-amber-300">
                    Olymp Trade doesn&apos;t accept temporary email addresses — use a personal one.
                  </p>
                ) : (
                  <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
                    Use a real address you can access. It must not already be registered with Olymp Trade.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="olymp-country" className="text-xs">Country</Label>
                <select
                  id="olymp-country"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-foreground outline-none focus:border-blue-400/50"
                >
                  {COUNTRIES.map((item) => (
                    <option key={item.code} value={item.code} className="bg-[#0a0f16]">
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={createAccount.isPending || !emailValue.trim() || emailIsDisposable}
              className="w-full bg-blue-600 text-white hover:bg-blue-500 sm:w-auto"
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
          </form>

          {createAccount.isError ? (
            <div className="mt-3 flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs leading-5 text-amber-200/90">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{(createAccount.error as Error).message}</span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <dl className="grid gap-x-6 gap-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm sm:grid-cols-2">
            {status.email ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Registered email</dt>
                <dd className="truncate font-medium">{status.email}</dd>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Olymp account ID</dt>
              <dd className="font-medium">{status.olympUserId}</dd>
            </div>
          </dl>

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
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {account.currency} · #{account.id}
                  </p>
                </div>
              ))}
            </div>
          ) : status.accountsError ? (
            <p className="text-xs text-muted-foreground">
              Couldn&apos;t load your balance right now. Your account is still connected.
            </p>
          ) : null}

          {isReal && realAccount && realAccount.balance <= 0 ? (
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

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            {/* Practice vs real money. Demo is the default so a user can
                watch the bot work for a few days before anything is at
                stake, and switching to real is a deliberate, separate act. */}
            <div className="mb-4">
              <p className="text-sm font-medium">Trading mode</p>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {([
                  { value: "demo" as const, label: "Practice", note: "Olymp's demo balance. Nothing at risk." },
                  { value: "real" as const, label: "Real money", note: "Trades your own deposited funds." },
                ]).map((option) => {
                  const selected = activeGroup === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={updateSettings.isPending}
                      onClick={() => updateSettings.mutate({ accountGroup: option.value })}
                      className={`rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-60 ${
                        selected
                          ? option.value === "real"
                            ? "border-amber-500/40 bg-amber-500/10 text-foreground"
                            : "border-primary/40 bg-primary/10 text-foreground"
                          : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="block text-xs font-semibold">{option.label}</span>
                      <span className="mt-0.5 block text-[10px] leading-4 text-muted-foreground">{option.note}</span>
                    </button>
                  );
                })}
              </div>
              {activeAccount ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Trading the {isReal ? "real" : "practice"} balance:{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(activeAccount.balance, activeAccount.currency)}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Automated trading</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {status.tradingEnabled
                    ? isReal
                      ? "The bot is trading this account with real money."
                      : "The bot is trading your practice balance. No real money is at risk."
                    : isReal
                      ? "Off. Turn this on to let the bot trade your account with real money."
                      : "Off. Turn this on to let the bot trade your practice balance."}
                </p>
              </div>
              <Switch
                checked={Boolean(status.tradingEnabled)}
                disabled={updateSettings.isPending}
                onCheckedChange={(checked) => updateSettings.mutate({ tradingEnabled: checked })}
              />
            </div>

            <div className="mt-4 flex items-end gap-3">
              <div className="w-32">
                <Label htmlFor="olymp-amount" className="text-xs">Amount per trade</Label>
                <Input
                  id="olymp-amount"
                  type="number"
                  min={1}
                  step="any"
                  value={amountValue}
                  onChange={(event) => setAmount(event.target.value)}
                  className="mt-1.5"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={updateSettings.isPending || Number(amountValue) <= 0 || Number(amountValue) === status.baseAmount}
                onClick={() => updateSettings.mutate({ baseAmount: Number(amountValue) })}
              >
                Save
              </Button>
            </div>
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
              In your account&apos;s own currency. The bot skips a signal if your balance is lower than this.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
