"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, ChevronUp, Crown, Radar, Shield } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { MetaTrader5Icon } from "@/components/icons/metatrader5-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmailNotice } from "@/components/ui/email-notice";
import { api, getPricingPlans, normalizeUserProfile } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency, formatDate, normalizeCurrencyCode } from "@/lib/utils";
import type { PlanTier, UserProfile } from "@/types";

interface VerifyResult {
  valid: boolean;
  code: string;
  plan: string;
  durationDays: number;
  expiresAt: string;
  bot?: { _id: string; name: string; slug: string };
}

interface SubscriptionManagerProps {
  status?: string;
  required?: string;
  selectedPlan?: string;
}

function isPaidPlanTier(value: PlanTier): value is Exclude<PlanTier, "NONE"> {
  return value === "STANDARD" || value === "PRO" || value === "VIP";
}

type PaidPlanTier = Exclude<PlanTier, "NONE">;
type ProductChoice = "binary" | "forex";

const PLAN_RANK: Record<string, number> = { NONE: 0, STANDARD: 1, PRO: 2, VIP: 3 };

const planStyles = {
  STANDARD: { icon: Shield, color: "text-sky-300", bg: "bg-sky-400/10 border-sky-400/20" },
  PRO: { icon: Radar, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  VIP: { icon: Crown, color: "text-emerald-300", bg: "bg-emerald-400/10 border-emerald-400/20" },
} as const;

export function SubscriptionManager({ status, required, selectedPlan }: SubscriptionManagerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCodePanel, setShowCodePanel] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [verified, setVerified] = useState<VerifyResult | null>(null);
  const [productByPlan, setProductByPlan] = useState<Record<string, ProductChoice>>({
    STANDARD: "binary",
    PRO: "binary",
  });
  const [accessCodeProduct, setAccessCodeProduct] = useState<ProductChoice>("binary");

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/auth/access-code/verify", { code: codeInput.trim().toUpperCase() });
      return res.data as VerifyResult;
    },
    onSuccess: (data: any) => {
      if (data.valid) {
        setVerified(data);
      } else {
        toast.error(data.message || "Invalid access code");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Code verification failed");
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async () => {
      const isVipCode = verified!.plan.toLowerCase() === "vip";
      const res = await api.post("/user/access-code/redeem", {
        code: verified!.code,
        ...(isVipCode ? {} : { product: accessCodeProduct }),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Access code redeemed. Activation details have been sent to your email.");
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing });
      router.push("/dashboard");
    },
    onError: (error: Error) => {
      const msg = error.message;
      if (msg.includes("already redeemed")) {
        toast.error("You have already redeemed this access code.");
      } else if (msg.includes("maximum usage limit")) {
        toast.error("This access code has reached its maximum usage limit.");
      } else {
        toast.error(msg || "Redemption failed");
      }
    },
  });

  const { data: profile } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => normalizeUserProfile((await api.get("/user/profile")).data) as UserProfile | null,
  });

  const { data: pricing = [] } = useQuery({
    queryKey: queryKeys.pricing,
    queryFn: getPricingPlans,
  });

  const safePricing = pricing.filter((plan): plan is typeof plan & { tier: PaidPlanTier } => isPaidPlanTier(plan.tier));
  const getPlanCurrency = (currency?: string | null) => normalizeCurrencyCode(currency) ?? "USD";
  const normalizedSelectedPlan = String(selectedPlan ?? "").trim().toUpperCase();
  const currentPlanTier = profile?.subscription?.active ? profile?.subscription?.plan : "NONE";
  const currentProduct = (profile?.subscription as any)?.product ?? null;

  async function initializePayment(plan: Exclude<PlanTier, "NONE">, provider: "paystack" | "crypto") {
    try {
      const endpoint = provider === "paystack" ? "/payment/initialize/paystack" : "/payment/initialize/crypto";
      const product = plan === "VIP" ? undefined : productByPlan[plan] ?? "binary";
      const response = await api.post(endpoint, { plan: plan.toLowerCase(), ...(product ? { product } : {}) });
      const url = response.data?.authorization_url ?? response.data?.checkout_url ?? response.data?.authorizationUrl ?? response.data?.paymentUrl ?? response.data?.url;
      if (!url) throw new Error("Payment URL missing from response");
      window.location.href = url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to initialize payment");
    }
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Plans</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          {required ? "Choose a plan to get started with NOJAI." : "Manage your subscription and billing."}
        </p>
      </div>

      {/* Status banner */}
      {status === "success" && (
        <div className="space-y-2">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-sm text-emerald-300">
            Payment completed successfully. Your plan is now active.
          </div>
          <EmailNotice
            variant="sent"
            message="Payment confirmation will be emailed to your registered address after verification."
          />
        </div>
      )}
      {status === "cancelled" && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-muted-foreground">
          Payment was not completed. No charge was made. You can try again below.
        </div>
      )}
      {status === "pending" && (
        <div className="space-y-2">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-300">
            Payment is pending blockchain confirmation. This may take a few minutes.
          </div>
          <EmailNotice
            variant="pending"
            message="Crypto payments may remain pending until the transaction is confirmed on the blockchain. You will be notified by email once your plan is active."
          />
        </div>
      )}

      {/* Current subscription */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Current Plan</p>
          <p className="mt-2 font-display text-lg font-semibold">{currentPlanTier === "NONE" ? "None" : currentPlanTier}</p>
          {currentProduct ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {currentProduct === "all" ? "Binary + Forex / MT5" : currentProduct === "forex" ? "Forex Leverage / MT5" : "Binary Options"}
            </p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</p>
          <div className="mt-2 flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${profile?.subscription?.active ? "bg-emerald-400" : "bg-amber-400"}`} />
            <p className="text-sm font-medium">{profile?.subscription?.active ? "Active" : "Inactive"}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Expires</p>
          <p className="mt-2 text-sm font-medium">{formatDate(profile?.subscription?.expiresAt)}</p>
        </div>
      </div>

      {/* Plan cards */}
      <div>
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">Available Plans</h2>

        {/* VIP banner */}
        {currentPlanTier === "VIP" && (
          <div className="mb-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
            <p className="text-sm font-semibold text-emerald-300">🎉 You are on the highest plan — VIP. No upgrade needed.</p>
            <p className="mt-1 text-xs text-muted-foreground">Your subscription gives you full access to every feature NOJAI offers.</p>
          </div>
        )}

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {safePricing.map((plan) => {
            const tier = plan.tier;
            const style = planStyles[tier];
            const Icon = style.icon;
            const currency = getPlanCurrency(plan.currency);
            const isCurrent = currentPlanTier === tier;
            const isHighlighted = normalizedSelectedPlan === tier;
            const isLower = (PLAN_RANK[tier] ?? 0) < (PLAN_RANK[currentPlanTier] ?? 0);
            const isLocked = isLower && !isCurrent;

            return (
              <div
                key={plan._id}
                className={`rounded-2xl border p-5 sm:p-6 transition-colors ${
                  isLocked
                    ? "border-white/[0.04] bg-white/[0.01] opacity-50"
                    : isHighlighted
                      ? "border-primary/30 bg-primary/[0.04]"
                      : isCurrent
                        ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                        : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                {/* Plan header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-base font-semibold">{plan.name}</p>
                      {isCurrent ? <Badge variant="success">Current</Badge> : null}
                      {isHighlighted && !isCurrent ? <Badge>Selected</Badge> : null}
                      {tier === "PRO" && !isCurrent && !isLocked ? <Badge>Popular</Badge> : null}
                      {isLocked ? <Badge variant="secondary">Locked</Badge> : null}
                    </div>
                    <div className="mt-2 flex items-end gap-2">
                      <p className="font-display text-3xl font-semibold">{formatCurrency(plan.price, currency)}</p>
                      <span className="pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{currency}</span>
                      {plan.compareAtPrice && plan.compareAtPrice > plan.price ? (
                        <span className="pb-1 text-sm font-semibold text-muted-foreground/50 line-through">{formatCurrency(plan.compareAtPrice, currency)}</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">every {plan.durationInDays} days</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${style.bg}`}>
                    <Icon className={`h-5 w-5 ${style.color}`} />
                  </div>
                </div>

                {/* Features */}
                <ul className="mt-5 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {tier !== "VIP" && !isCurrent && !isLocked && currentPlanTier !== "VIP" ? (
                  <div className="mt-5 rounded-xl border border-white/[0.06] bg-black/10 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Choose product</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {([
                        { value: "binary" as const, label: "Binary Options", note: "IQ/EO bot" },
                        { value: "forex" as const, label: "Forex / MT5", note: "Leverage trading" },
                      ]).map((option) => {
                        const selected = (productByPlan[tier] ?? "binary") === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setProductByPlan((prev) => ({ ...prev, [tier]: option.value }))}
                            className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                              selected
                                ? "border-primary/40 bg-primary/10 text-foreground"
                                : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <div className="mb-1.5 flex items-center gap-1.5">
                              {option.value === "binary" ? (
                                <div className="flex -space-x-1.5">
                                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white p-0.5 shadow-sm ring-2 ring-background">
                                    <Image src="/autobot-assets/iq-option-small.svg" alt="IQ Option" width={12} height={12} className="h-full w-full object-contain" />
                                  </div>
                                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white p-0.5 shadow-sm ring-2 ring-background">
                                    <Image src="/autobot-assets/experoptionlogo.png" alt="ExpertOption" width={12} height={12} className="h-full w-full object-contain" />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white p-0.5 shadow-sm ring-2 ring-background">
                                  <MetaTrader5Icon className="h-full w-full" stroke="#011118" />
                                </div>
                              )}
                              <span className="block text-xs font-semibold">{option.label}</span>
                            </div>
                            <span className="block text-[10px] text-muted-foreground">{option.note}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : tier === "VIP" && !isCurrent ? (
                  <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3 text-xs text-emerald-200">
                    VIP includes both Binary Options and Forex Leverage / MT5 access.
                  </div>
                ) : null}

                {/* Payment buttons */}
                {isCurrent ? (
                  <p className="mt-6 text-xs text-muted-foreground">This is your current active plan.</p>
                ) : isLocked ? (
                  <p className="mt-6 text-xs text-muted-foreground">
                    Not available while you have an active higher plan. Returns after your current plan expires.
                  </p>
                ) : currentPlanTier === "VIP" ? null : (
                  <div className="mt-6 flex flex-col gap-2">
                    <Button size="sm" onClick={() => initializePayment(tier, "paystack")}>Pay with Paystack</Button>
                    <Button size="sm" variant="outline" onClick={() => initializePayment(tier, "crypto")}>Pay with Crypto</Button>
                    <p className="text-[11px] text-muted-foreground/60">
                      Payment confirmation will be emailed after verification.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Subtle access code option — intentionally low-profile */}
      <div className="mt-2 text-center">
        <button
          type="button"
          onClick={() => { setShowCodePanel((v) => !v); setVerified(null); setCodeInput(""); }}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          Have an access code?
          {showCodePanel ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {showCodePanel && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5 space-y-4">
          {!verified ? (
            <>
              <div>
                <p className="text-sm font-medium">Redeem Access Code</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Enter your code to check its validity before redeeming.</p>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="IQ-XXXXXXXX"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  className="font-mono tracking-wider"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => verifyMutation.mutate()}
                  disabled={verifyMutation.isPending || !codeInput.trim()}
                >
                  {verifyMutation.isPending ? "Checking..." : "Verify"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 space-y-1">
                <p className="text-sm font-semibold text-emerald-300">{verified.plan.toUpperCase()} Plan</p>
                <p className="text-xs text-muted-foreground">{verified.durationDays} days of access</p>
                <p className="text-xs text-muted-foreground">Code expires: {formatDate(verified.expiresAt)}</p>
              </div>

              {/* Product selector — non-VIP codes require a choice */}
              {verified.plan.toLowerCase() !== "vip" ? (
                <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">What are you subscribing for?</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {([
                      { value: "binary" as const, label: "Binary Options", note: "IQ Option / Expert Option bot" },
                      { value: "forex" as const, label: "Forex / MT5", note: "Leverage trading on MT5" },
                    ]).map((option) => {
                      const selected = accessCodeProduct === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setAccessCodeProduct(option.value)}
                          className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                            selected
                              ? "border-primary/40 bg-primary/10 text-foreground ring-1 ring-primary/20"
                              : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <div className="mb-1.5 flex items-center gap-1.5">
                            {option.value === "binary" ? (
                              <div className="flex -space-x-1.5">
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white p-0.5 shadow-sm ring-2 ring-background">
                                  <Image src="/autobot-assets/iq-option-small.svg" alt="IQ Option" width={12} height={12} className="h-full w-full object-contain" />
                                </div>
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white p-0.5 shadow-sm ring-2 ring-background">
                                  <Image src="/autobot-assets/experoptionlogo.png" alt="ExpertOption" width={12} height={12} className="h-full w-full object-contain" />
                                </div>
                              </div>
                            ) : (
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white p-0.5 shadow-sm ring-2 ring-background">
                                <MetaTrader5Icon className="h-full w-full" stroke="#011118" />
                              </div>
                            )}
                            <span className="block text-xs font-semibold">{option.label}</span>
                          </div>
                          <span className="block text-[10px] text-muted-foreground">{option.note}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3 text-xs text-emerald-200">
                  VIP includes both Binary Options and Forex Leverage / MT5 access.
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => redeemMutation.mutate()}
                  disabled={redeemMutation.isPending}
                >
                  {redeemMutation.isPending ? "Redeeming..." : `Redeem — ${verified.plan.toLowerCase() === "vip" ? "Full Access" : accessCodeProduct === "forex" ? "Forex / MT5" : "Binary Options"}`}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setVerified(null); setCodeInput(""); }}>
                  Change Code
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
