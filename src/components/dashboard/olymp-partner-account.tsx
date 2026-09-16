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
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("NG");
  const [amount, setAmount] = useState("");

  const { data: status, isLoading } = useQuery<OlympPartnerStatus>({
    queryKey: ["olymp-partner-status"],
    queryFn: async () => (await api.get("/olymp-partner/status")).data as OlympPartnerStatus,
    refetchInterval: 60_000,
  });

  const createAccount = useMutation({
    mutationFn: async (payload: { email: string; country: string; password: string }) =>
      (await api.post("/olymp-partner/account", payload)).data,
    onSuccess: () => {
      toast.success("Your Olymp Trade account is ready. Sign in to Olymp with the email and password you chose.");
      // Don't leave the broker password sitting in component state once it
      // has served its purpose.
      setPassword("");
      void queryClient.invalidateQueries({ queryKey: ["olymp-partner-status"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateSettings = useMutation({
    mutationFn: async (payload: { tradingEnabled?: boolean; baseAmount?: number; accountGroup?: "real" }) =>
      (await api.patch("/olymp-partner/settings", payload)).data,
    onSuccess: (_data, variables) => {
      if (variables.accountGroup) {
        // Moving to real money deserves a blunter confirmation than a
        // settings-saved nudge -- it changes whose money is at stake.
        toast.success("Switched to real money. The bot will now trade your deposited funds.");
      } else if (variables.tradingEnabled === undefined) {
        toast.success("Trade amount saved.");
      } else {
        toast.success(variables.tradingEnabled ? "Automated trading is on." : "Automated trading is off.");
      }
      void queryClient.invalidateQueries({ queryKey: ["olymp-partner-status"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // The job of these buttons is to land the user on Olymp. A one-click login
  // is a convenience on top of that, so nothing here surfaces a failure to
  // reach for it -- the server always answers with somewhere to go, and the
  // worst case is the user signing in themselves rather than a dead button.
  const [ssoCooldown, setSsoCooldown] = useState(false);

  const openSso = (path: SsoTarget) => {
    // Opened synchronously inside the click handler: calling window.open
    // after an await is treated as a popup and silently blocked, which is
    // what made this button look broken.
    //
    // No "noopener" here -- it makes window.open return null by design, so we
    // opened a tab we then had no reference to, could never navigate, and
    // left sitting blank while the current page redirected instead. The
    // opener link is severed below rather than at open time.
    const tab = window.open("", "_blank");
    if (tab) {
      // Same protection noopener gives, without losing the handle.
      try {
        tab.opener = null;
      } catch {
        // Older browsers disallow the assignment; the tab is ours either way.
      }
      tab.document.write(
        "<title>Opening Olymp Trade…</title>" +
        "<body style=\"margin:0;display:grid;place-items:center;height:100vh;" +
        "font:15px system-ui,sans-serif;background:#0b1220;color:#e6edf7\">" +
        "Opening Olymp Trade…</body>",
      );
    }

    setPendingTarget(path);
    setSsoCooldown(true);
    window.setTimeout(() => setSsoCooldown(false), 8000);

    api
      .post("/olymp-partner/sso-link", { path })
      .then((res) => {
        const url = (res.data as { url?: string })?.url;
        if (!url) throw new Error("no url");
        if (tab) tab.location.replace(url);
        else window.location.href = url;
      })
      .catch(() => {
        // Even a total failure should not strand the user: send them to
        // Olymp's own site, which is where they were trying to go.
        const fallback = "https://olymptrade.com/";
        if (tab) tab.location.replace(fallback);
        else window.location.href = fallback;
      })
      .finally(() => setPendingTarget(null));
  };


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
                We&apos;ll create your Olymp Trade account for you. Pick a password and you can sign in to
                Olymp anywhere — including their mobile app. Your deposit always goes to your own account,
                never to NOJAI.
              </div>
            </div>
          </div>

          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createAccount.mutate({ email: emailValue.trim(), country, password });
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

            <div>
              <Label htmlFor="olymp-password" className="text-xs">Password for your Olymp account</Label>
              <Input
                id="olymp-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                className="mt-1.5"
                autoComplete="new-password"
              />
              {/* Stated plainly because it is the only copy of this password
                  that will ever exist on our side -- we don't store it. */}
              <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
                This is your <span className="font-medium text-foreground">Olymp Trade</span> password, not your
                NOJAI one. Use it to sign in to the Olymp app or website. We don&apos;t store it, so save it
                somewhere safe.
              </p>
            </div>

            <Button
              type="submit"
              disabled={createAccount.isPending || !emailValue.trim() || emailIsDisposable || password.length < 8}
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
              onClick={() => openSso("/payin")}
              disabled={ssoCooldown}
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
              onClick={() => openSso("/trading")}
              disabled={ssoCooldown}
            >
              {pendingTarget === "/trading" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpRight className="mr-2 h-4 w-4" />
              )}
              Open Olymp Trade
            </Button>
          </div>

          <details className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <summary className="cursor-pointer text-xs font-medium">Signing in to the Olymp app</summary>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              Use the email above and the password you chose when you created the account. If you created it
              before passwords were offered — or you&apos;ve forgotten it — open Olymp and use
              &ldquo;Forgot password&rdquo; with that email to set a new one. It won&apos;t affect the bot.
            </p>
          </details>

          <p className="text-[11px] leading-5 text-muted-foreground">
            {ssoCooldown
              ? "Opening Olymp in a new tab — check your other tabs if you don't see it."
              : "These open Olymp already logged in — you never need an Olymp password. Olymp allows 3 of these per hour."}
          </p>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            {/* Practice trading is suspended. An account still carrying it
                is not promoted automatically -- the user makes that call,
                because it moves the bot onto their own funds. */}
            {!isReal ? (
              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-4">
                <p className="text-sm font-semibold text-amber-200">Practice trading has ended</p>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  The bot is paused on this account. Switching to real money means it trades the funds in
                  your Olymp account, and losses are real.
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 bg-amber-500 text-black hover:bg-amber-400"
                  disabled={updateSettings.isPending}
                  onClick={() => updateSettings.mutate({ accountGroup: "real" })}
                >
                  Switch to real money
                </Button>
              </div>
            ) : null}

            {activeAccount ? (
              <p className="mb-4 text-[11px] text-muted-foreground">
                Trading balance:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(activeAccount.balance, activeAccount.currency)}
                </span>
              </p>
            ) : null}

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Automated trading</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {status.tradingEnabled
                    ? "The bot is trading this account with real money."
                    : "Off. Turn this on to let the bot trade your account with real money."}
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
