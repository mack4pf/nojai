"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
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

interface MartingaleData {
  plan: string;
  canCustomize: boolean;
  currentSteps: number[];
  accounts: MartingaleAccount[];
  defaultDuration: number;
}

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

  const { data, isLoading, isError, refetch } = useQuery<MartingaleData>({
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
    onSuccess: (result: any, variables) => {
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
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed to save"),
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

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading martingale settings…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-xs text-muted-foreground">
          Could not load martingale settings. Make sure you have an active subscription.
        </p>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5">
          <RotateCcw className="h-3 w-3" /> Try Again
        </Button>
      </div>
    );
  }

  if (!data.canCustomize) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3">
        <h3 className="font-display text-base font-bold">Martingale Steps</h3>
        <p className="text-xs text-muted-foreground">
          VIP plan required to customize martingale steps. Your current steps are inherited from the bot default.
        </p>
        <div className="flex flex-wrap gap-2">
          {(data.currentSteps ?? []).map((s, i) => (
            <span key={i} className="rounded-lg bg-white/[0.06] px-3 py-1 font-mono text-sm font-semibold">
              {s}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-amber-400">
          Upgrade to <strong>VIP</strong> to set personal overrides per account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-base font-bold">Martingale Steps (VIP)</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Customize martingale steps per account. Personal overrides take effect only for that account and override the bot default.
        </p>
      </div>

      {/* Bot default reference */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Bot Default Steps</p>
        <div className="flex flex-wrap gap-2">
          {(data.currentSteps ?? []).map((s, i) => (
            <span key={i} className="rounded-lg bg-white/[0.08] px-3 py-1 font-mono text-sm text-muted-foreground">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Per-account editors */}
      <div className="space-y-4">
        {data.accounts.map((acc) => {
          const hasOverride = isOverride(acc.martingaleSteps, data.currentSteps);
          const isPending = saveMutation.isPending && (saveMutation.variables as any)?.email === acc.email;

          return (
            <div key={acc.email} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
              {/* Account header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-foreground">{acc.email}</span>
                  {hasOverride ? (
                    <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                      Personal Override
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      Bot Default
                    </span>
                  )}
                  {!acc.martingaleEnabled && (
                    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                      Disabled
                    </span>
                  )}
                </div>
                {saved[acc.email] && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
              </div>

              {/* Steps input */}
              <div className="space-y-2">
                <Label className="text-xs">Steps (comma-separated)</Label>
                <Input
                  value={inputs[acc.email] ?? ""}
                  onChange={(e) => {
                    setInputs((prev) => ({ ...prev, [acc.email]: e.target.value }));
                    setErrors((prev) => ({ ...prev, [acc.email]: "" }));
                    setSaved((prev) => ({ ...prev, [acc.email]: false }));
                  }}
                  placeholder="e.g. 1, 1, 2, 4, 8"
                  className="max-w-sm font-mono"
                  disabled={isPending}
                />
                {errors[acc.email] && (
                  <p className="text-xs text-red-400">{errors[acc.email]}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Overrides the bot default only for this account. All values must be positive numbers.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSave(acc.email)}
                  disabled={isPending}
                >
                  {isPending && !saveMutation.variables?.resetToBotDefault ? (
                    <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Saving…</>
                  ) : "Save Override"}
                </Button>
                {hasOverride && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReset(acc.email)}
                    disabled={isPending}
                  >
                    {isPending && saveMutation.variables?.resetToBotDefault ? (
                      <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Resetting…</>
                    ) : (
                      <><RotateCcw className="mr-1.5 h-3 w-3" />Reset to Bot Default</>
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
