"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, RotateCcw, TrendingUp, ShieldCheck, Zap, Info } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MartingaleAccount {
  email: string;
  martingaleEnabled: boolean;
  martingaleSteps: number[];
  isOverride?: boolean;
}

interface MartingaleRecommendation {
  id: string;
  name: string;
  description: string;
  steps: number[];
  riskLevel: "Low" | "Medium" | "High";
  type: "Aggressive" | "Safe" | "Steady" | "Conservative";
}

interface MartingaleData {
  plan: string;
  canCustomize: boolean;
  currentSteps: number[];
  accounts: MartingaleAccount[];
  defaultDuration: number;
  recommendations?: MartingaleRecommendation[];
}

const DEFAULT_RECOMMENDATIONS: MartingaleRecommendation[] = [
  {
    id: "standard-aggressive",
    name: "Standard Aggressive",
    description: "Standard martingale with a 2.1x multiplier. Recommended for balanced growth.",
    steps: [1, 2.1, 4.4, 9.2, 19.3],
    riskLevel: "Medium",
    type: "Aggressive",
  },
  {
    id: "safe-start",
    name: "Safe Start",
    description: "Low initial risk with higher recovery steps. Best for conservative traders.",
    steps: [1, 1, 2.2, 4.8, 10.5],
    riskLevel: "Low",
    type: "Safe",
  },
  {
    id: "steady-growth",
    name: "Steady Growth",
    description: "Consistent 2x multiplier. Simple and effective for long-term consistency.",
    steps: [1, 2, 4, 8, 16],
    riskLevel: "Medium",
    type: "Steady",
  },
  {
    id: "pro-recovery",
    name: "Conservative Pro",
    description: "Minimum recovery steps to preserve capital during market volatility.",
    steps: [1, 2.2, 5.1, 12, 28],
    riskLevel: "High",
    type: "Conservative",
  }
];

function parseStepsInput(raw: string): number[] | null {
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isFinite(n) || n <= 0)) return null;
  return nums;
}

function stepsToString(steps: number[]): string {
  return steps.join(", ");
}

function isOverride(accountSteps: number[], defaultSteps: number[]): boolean {
  if (accountSteps.length !== defaultSteps.length) return true;
  return accountSteps.some((s, i) => s !== defaultSteps[i]);
}

export function VipMartingaleSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<MartingaleData>({
    queryKey: ["user-martingale"],
    queryFn: async () => (await api.get("/user/martingale")).data,
  });

  // Per-account local state: { email -> inputString }
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!data) return;
    const next: Record<string, string> = {};
    for (const acc of data.accounts) {
      if (!(acc.email in inputs)) {
        next[acc.email] = stepsToString(acc.martingaleSteps);
      }
    }
    if (Object.keys(next).length > 0) {
      setInputs((prev) => ({ ...prev, ...next }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async ({ email, martingaleSteps, resetToBotDefault }: { email: string; martingaleSteps?: number[]; resetToBotDefault?: boolean }) => {
      const res = await api.put("/user/martingale", { email, martingaleSteps, resetToBotDefault });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-martingale"] });
      if (variables.resetToBotDefault) {
        toast.success("Reset to bot default");
        setInputs((prev) => ({ ...prev, [variables.email]: stepsToString(data?.currentSteps ?? []) }));
      } else {
        toast.success("Steps saved");
      }
      setSaved((prev) => ({ ...prev, [variables.email]: true }));
      setTimeout(() => setSaved((prev) => ({ ...prev, [variables.email]: false })), 3000);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e?.response?.data?.message ?? "Failed to save"),
  });

  function handleSave(email: string) {
    const raw = inputs[email] ?? "";
    const parsed = parseStepsInput(raw);
    if (!parsed) {
      setErrors((prev) => ({ ...prev, [email]: "Enter positive numbers separated by commas, e.g. 1, 1, 2, 4" }));
      return;
    }
    setErrors((prev) => ({ ...prev, [email]: "" }));
    saveMutation.mutate({ email, martingaleSteps: parsed });
  }

  function handleReset(email: string) {
    saveMutation.mutate({ email, resetToBotDefault: true });
  }

  function applyRecommendation(email: string, steps: number[]) {
    setInputs((prev) => ({ ...prev, [email]: stepsToString(steps) }));
    setErrors((prev) => ({ ...prev, [email]: "" }));
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading martingale settings…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-xs text-muted-foreground py-4">
        Could not load martingale settings. Make sure you have an active subscription.
      </p>
    );
  }

  const recommendations = data.recommendations ?? DEFAULT_RECOMMENDATIONS;

  if (!data.canCustomize) {
    return (
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-500/10 p-2 text-violet-400">
            <Zap className="h-5 w-5" />
          </div>
          <h3 className="font-display text-lg font-bold">Martingale Customization</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Unlock the ability to set personal martingale overrides for each of your connected accounts. 
          Pro and VIP users can choose from expert-recommended strategies or create their own.
        </p>
        <div className="space-y-2 border-t border-white/5 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your Current Active Steps (Bot Default):</p>
          <div className="flex flex-wrap gap-2">
            {(data.currentSteps ?? []).map((s, i) => (
              <span key={i} className="rounded-lg bg-white/[0.06] px-4 py-2 font-mono text-sm font-bold border border-white/5">
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 p-4">
          <p className="text-[11px] text-amber-200/80 flex items-center gap-2">
            <Info className="h-3.5 w-3.5 shrink-0" />
            Upgrade to <strong>PRO</strong> or <strong>VIP</strong> to set personal overrides per account and access pro strategies.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-lg font-bold">Martingale Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Configure how the bot manages risk and recovery for your accounts.
        </p>
      </div>

      {/* Bot default reference */}
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Global Bot Default</p>
          <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-muted-foreground">Used for all accounts unless overridden</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(data.currentSteps ?? []).map((s, i) => (
            <div key={i} className="relative group">
              <span className="inline-block rounded-xl bg-white/[0.05] px-4 py-2.5 font-mono text-sm font-bold text-white/70 border border-white/5">
                {s}
              </span>
              <span className="absolute -top-2 -right-2 bg-white/10 text-[9px] px-1.5 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                #{i+1}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-account editors */}
      <div className="space-y-5">
        {data.accounts.map((acc) => {
          const hasOverride = isOverride(acc.martingaleSteps, data.currentSteps);
          const isPending = saveMutation.isPending && saveMutation.variables?.email === acc.email;

          return (
            <div key={acc.email} className="rounded-3xl border border-white/[0.08] bg-white/[0.01] p-6 space-y-6 transition-all hover:bg-white/[0.02] hover:border-white/10">
              {/* Account header */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${hasOverride ? 'bg-violet-500/10 text-violet-400' : 'bg-white/5 text-muted-foreground'}`}>
                    {hasOverride ? <Zap className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                  </div>
                  <div>
                    <span className="font-mono text-sm font-bold text-foreground block">{acc.email}</span>
                    <div className="mt-1 flex items-center gap-2">
                      {hasOverride ? (
                        <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-300 ring-1 ring-violet-500/20">
                          Personal Override
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground ring-1 ring-white/10">
                          Bot Default Active
                        </span>
                      )}
                      {!acc.martingaleEnabled && (
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-300">
                          Martingale Disabled
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {saved[acc.email] && (
                  <div className="animate-in fade-in slide-in-from-right-2">
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/20">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Updated Successfully
                    </span>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Expert Recommendations</Label>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {recommendations.map((rec, recIdx) => (
                    <button
                      key={`${acc.email}-${rec.id ?? recIdx}`}
                      onClick={() => applyRecommendation(acc.email, rec.steps)}
                      className="group flex flex-col text-left rounded-2xl border border-white/5 bg-white/[0.02] p-3 transition-all hover:bg-white/[0.05] hover:border-violet-500/30"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-foreground group-hover:text-violet-300 transition-colors">{rec.name}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          rec.riskLevel === 'Low' ? 'bg-emerald-500/10 text-emerald-400' :
                          rec.riskLevel === 'Medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {rec.riskLevel}
                        </span>
                      </div>
                      <p className="text-[9px] text-muted-foreground line-clamp-2 leading-tight">
                        {rec.description}
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {rec.steps.slice(0, 3).map((s, idx) => (
                          <span key={idx} className="text-[9px] font-mono bg-white/5 px-1 rounded text-muted-foreground">
                            {s}
                          </span>
                        ))}
                        <span className="text-[9px] text-muted-foreground italic">...</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Steps input */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Custom Steps Input</Label>
                  <span className="text-[10px] text-muted-foreground italic">Comma-separated multipliers</span>
                </div>
                <Input
                  value={inputs[acc.email] ?? ""}
                  onChange={(e) => {
                    setInputs((prev) => ({ ...prev, [acc.email]: e.target.value }));
                    setErrors((prev) => ({ ...prev, [acc.email]: "" }));
                    setSaved((prev) => ({ ...prev, [acc.email]: false }));
                  }}
                  placeholder="e.g. 1, 2.1, 4.4, 9.2, 19.3"
                  className="h-12 rounded-2xl border-white/10 bg-white/[0.03] font-mono text-base focus:border-violet-500/50 focus:ring-violet-500/20"
                  disabled={isPending}
                />
                {errors[acc.email] && (
                  <p className="text-[11px] font-medium text-red-400 flex items-center gap-1.5">
                    <Info className="h-3 w-3" /> {errors[acc.email]}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                  Tip: Multipliers higher than 2.1x recover faster but increase risk exponentially. Standard is 2x.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={() => handleSave(acc.email)}
                  disabled={isPending}
                  className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/20"
                >
                  {isPending && !saveMutation.variables?.resetToBotDefault ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Applying...</>
                  ) : (
                    <><CheckCircle2 className="mr-2 h-4 w-4" /> Save Settings</>
                  )}
                </Button>
                
                {hasOverride && (
                  <Button
                    variant="ghost"
                    onClick={() => handleReset(acc.email)}
                    disabled={isPending}
                    className="rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground"
                  >
                    {isPending && saveMutation.variables?.resetToBotDefault ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...</>
                    ) : (
                      <><RotateCcw className="mr-2 h-4 w-4" /> Reset to Default</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
