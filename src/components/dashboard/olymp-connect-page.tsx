"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, ExternalLink, Info, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { OlympAccountSetup } from "@/components/dashboard/olymp-account-setup";
import { OlympPartnerAccount } from "@/components/dashboard/olymp-partner-account";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency } from "@/lib/utils";

/**
 * The one place an Olymp account gets connected.
 *
 * Connecting used to be offered three ways on the dashboard: an access token,
 * an Olymp email and password, or the partner flow. The first two are gone.
 * Both asked the user for a broker credential we then had to hold, and the
 * token expired roughly every 48 hours with no way for us to renew it — so the
 * account stayed linked, stopped trading, and the user found out when they
 * noticed nothing had happened. Partner connections have nothing that expires.
 *
 * The Olymp signup rules live here rather than on the dashboard, because this
 * is the page where they change what the reader does next.
 */

interface OlympFreeAccessInfo {
  settings: {
    affiliateLink: string;
    minDeposit: number;
    bonusCode: string;
  };
}

export function OlympConnectPage() {
  const { data: olympFreeAccess } = useQuery<OlympFreeAccessInfo>({
    queryKey: queryKeys.olympFreeAccess,
    queryFn: async () => (await api.get("/user/olymp-free-access")).data as OlympFreeAccessInfo,
  });

  const bonusCode = olympFreeAccess?.settings?.bonusCode || "NOJAI";
  const affiliateLink = olympFreeAccess?.settings?.affiliateLink || "https://olymptrade.com/";
  const minDeposit = olympFreeAccess?.settings?.minDeposit ?? 10;

  function copyBonusCode() {
    navigator.clipboard.writeText(bonusCode);
    toast.success("Olymp bonus code copied");
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/dashboard/olymp-trade"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Olymp Trade
        </Link>
        <h1 className="mt-3 font-display text-xl font-semibold tracking-tight sm:text-2xl">
          Connect your Olymp account
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          The bot trades your own Olymp account. Your money stays with Olymp and NOJAI never holds it.
        </p>
      </div>

      <OlympAccountSetup createForm={<OlympPartnerAccount />} />

      {/* The rules. Kept next to the form because each one decides whether the
          form will work for this reader: an account opened outside our link
          cannot be connected at all, which is better to know before trying. */}
      <div className="dashboard-solid-panel space-y-4 rounded-2xl border border-emerald-500/25 bg-white/[0.02] p-4 sm:p-5">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <div>
            <h2 className="text-sm font-semibold">Signing up or logging in on Olymp</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Read this before connecting — it decides whether your account can be linked.
            </p>
          </div>
        </div>

        <ol className="space-y-3 text-xs leading-5 text-muted-foreground">
          <li className="flex gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-300">1</span>
            <span>
              <span className="font-semibold text-foreground">Your Olymp account must be registered under NOJAI&apos;s link.</span>{" "}
              Accounts opened anywhere else cannot be connected, and there is no way for us to move an
              existing one across. If you already have an Olymp account that was not opened through
              NOJAI, use <span className="text-foreground">Create one for me</span> above instead.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-300">2</span>
            <span>
              <span className="font-semibold text-foreground">Signing up yourself?</span> Use the button
              below, and enter bonus code <span className="font-semibold text-foreground">{bonusCode}</span>{" "}
              during signup. Deposit at least {formatCurrency(minDeposit, "USD")} to start trading for real.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-300">3</span>
            <span>
              <span className="font-semibold text-foreground">Logging in to Olymp is done on Olymp.</span>{" "}
              NOJAI never asks for your Olymp password and does not need it. You connect with your
              account ID, and we verify it is yours by matching the balance you enter.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-300">4</span>
            <span>
              <span className="font-semibold text-foreground">Automated trading stays off until you turn it on.</span>{" "}
              Connecting an account does not place any trades by itself.
            </span>
          </li>
        </ol>

        <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/70">Olymp bonus code</p>
            <code className="mt-1 block font-mono text-lg font-bold tracking-widest text-foreground">{bonusCode}</code>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={copyBonusCode}>
              <Copy className="h-4 w-4" /> Copy
            </Button>
            <Button asChild size="sm" className="gap-2">
              <a href={affiliateLink} target="_blank" rel="noreferrer">
                Open Olymp <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        <div className="flex gap-2 rounded-xl border border-white/[0.06] bg-black/20 p-3 text-[11px] leading-5 text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Connecting by account ID has nothing that expires, so it does not have to be redone. The old
            access-token and Olymp-password logins have been removed — a token stopped working after about
            48 hours and left the account linked but unable to trade.
          </span>
        </div>
      </div>
    </div>
  );
}
