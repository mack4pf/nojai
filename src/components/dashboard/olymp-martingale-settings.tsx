"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Minus, Plus, RotateCcw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

/**
 * Martingale controls for the Partner-created Olymp account.
 *
 * Martingale is easy to present dishonestly: a ladder of [1,1,2,4,8] on a $1
 * base reads as "a dollar a trade" and costs $16 across a losing run. So the
 * table below prices every rung, and the cost of a full run is stated in the
 * user's own currency rather than left as an exercise.
 */

interface OlympPartnerStatus {
  linked: boolean;
  baseAmount?: number;
  accountGroup?: "real" | "demo";
  martingaleEnabled?: boolean;
  martingaleSteps?: number[];
  martingaleStep?: number;
  accounts?: Array<{ id: number; type: "real" | "demo"; currency: string; balance: number }>;
}

const MAX_STEPS = 10;
const MAX_MULTIPLIER = 100;

/** The ladder every other broker on NOJAI uses by default. */
const PRESETS: Array<{ name: string; steps: number[]; note: string }> = [
  { name: "Default", steps: [1, 1, 2, 4, 8], note: "The system default" },
  { name: "Gentle", steps: [1, 2, 3], note: "Short ladder, smaller worst case" },
  { name: "Flat", steps: [1], note: "Same stake every trade" },
];

export function OlympMartingaleSettings() {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery<OlympPartnerStatus>({
    queryKey: ["olymp-partner-status"],
    queryFn: async () => (await api.get("/olymp-partner/status")).data as OlympPartnerStatus,
    refetchInterval: 60_000,
  });

  const [enabled, setEnabled] = useState(true);
  const [steps, setSteps] = useState<string[]>(["1", "1", "2", "4", "8"]);
  const [baseAmount, setBaseAmount] = useState("1");
  const [dirty, setDirty] = useState(false);

  // Server state seeds the form, but never overwrites edits in progress —
  // a 60s refetch landing mid-edit would otherwise discard the user's work.
  useEffect(() => {
    if (!status || dirty) return;
    setEnabled(status.martingaleEnabled !== false);
    setSteps((status.martingaleSteps ?? [1, 1, 2, 4, 8]).map(String));
    setBaseAmount(String(status.baseAmount ?? 1));
  }, [status, dirty]);

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await api.patch("/olymp-partner/settings", payload)).data,
    onSuccess: () => {
      setDirty(false);
      toast.success("Martingale settings saved.");
      void queryClient.invalidateQueries({ queryKey: ["olymp-partner-status"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const account = (status?.accounts ?? []).find((item) => item.type === (status?.accountGroup ?? "demo"));
  const currency = account?.currency ?? "USD";
  const balance = account?.balance ?? 0;

  const numericSteps = steps.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);
  const base = Number(baseAmount);
  const baseValid = Number.isFinite(base) && base > 0;
  const stepsValid = numericSteps.length === steps.length && steps.length > 0;

  // The number that actually describes the risk: the sum of every rung, not
  // the largest one.
  const cycleExposure = baseValid && stepsValid
    ? Math.round(numericSteps.reduce((sum, m) => sum + base * m, 0) * 100) / 100
    : 0;
  const worstRung = baseValid && stepsValid ? Math.max(...numericSteps) * base : 0;
  const exceedsBalance = cycleExposure > balance && balance > 0;

  const currentStep = Number(status?.martingaleStep ?? 0);

  function updateStep(index: number, value: string) {
    setDirty(true);
    setSteps((prev) => prev.map((item, i) => (i === index ? value : item)));
  }

  function addStep() {
    if (steps.length >= MAX_STEPS) return;
    setDirty(true);
    const last = Number(steps[steps.length - 1]) || 1;
    setSteps((prev) => [...prev, String(last * 2)]);
  }

  function removeStep(index: number) {
    if (steps.length <= 1) return;
    setDirty(true);
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function applyPreset(preset: number[]) {
    setDirty(true);
    setSteps(preset.map(String));
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your settings…
      </div>
    );
  }

  if (!status?.linked) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <p className="text-sm font-medium">No Olymp account yet</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Create your Olymp account on the dashboard first — martingale applies to the account the bot trades.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">Martingale</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              After a loss the bot raises the next stake by the multiplier on the next step. A win goes back
              to step 1.
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => {
              setEnabled(checked);
              save.mutate({ martingaleEnabled: checked });
            }}
            disabled={save.isPending}
          />
        </div>

        {!enabled ? (
          <p className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 p-3 text-xs leading-5 text-muted-foreground">
            Off — every trade uses your base amount of{" "}
            <span className="font-semibold text-foreground">{formatCurrency(base || 0, currency)}</span>.
          </p>
        ) : null}
      </div>

      {enabled ? (
        <>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <Label htmlFor="olymp-base" className="text-xs">Base amount (step 1)</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <Input
                id="olymp-base"
                type="number"
                min={0.01}
                step={0.01}
                value={baseAmount}
                onChange={(event) => { setDirty(true); setBaseAmount(event.target.value); }}
                className="w-36"
              />
              <span className="text-xs text-muted-foreground">{currency}</span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              Every step is a multiple of this. Your {status.accountGroup === "real" ? "real" : "practice"}{" "}
              balance is {formatCurrency(balance, currency)}.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium">Steps</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset.steps)}
                    title={preset.note}
                    className="rounded-lg border border-white/[0.08] px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Each rung priced in the account's own currency, so the ladder
                is read as money rather than as multipliers. */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 font-medium">Step</th>
                    <th className="pb-2 font-medium">Multiplier</th>
                    <th className="pb-2 font-medium">Stake</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {steps.map((value, index) => {
                    const multiplier = Number(value);
                    const valid = Number.isFinite(multiplier) && multiplier > 0 && multiplier <= MAX_MULTIPLIER;
                    const stake = valid && baseValid ? Math.round(base * multiplier * 100) / 100 : null;
                    const isCurrent = index === currentStep;
                    return (
                      <tr key={index} className="border-t border-white/[0.05]">
                        <td className="py-2">
                          <span className={isCurrent ? "font-semibold text-primary" : "text-muted-foreground"}>
                            {index + 1}
                            {/* Where the bot currently stands, so the next
                                stake is never a surprise. */}
                            {isCurrent ? " · next" : ""}
                          </span>
                        </td>
                        <td className="py-2">
                          <Input
                            type="number"
                            min={0.01}
                            max={MAX_MULTIPLIER}
                            step={0.1}
                            value={value}
                            onChange={(event) => updateStep(index, event.target.value)}
                            className={`h-8 w-24 ${valid ? "" : "border-destructive/60"}`}
                          />
                        </td>
                        <td className="py-2 font-medium">
                          {stake !== null ? formatCurrency(stake, currency) : <span className="text-destructive">—</span>}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeStep(index)}
                            disabled={steps.length <= 1}
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-30"
                            aria-label={`Remove step ${index + 1}`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addStep}
              disabled={steps.length >= MAX_STEPS}
              className="mt-3"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add step
            </Button>
          </div>

          {/* The honest summary. A ladder looks cheap per trade and is not. */}
          <div
            className={`rounded-2xl border p-5 ${
              exceedsBalance ? "border-destructive/40 bg-destructive/[0.06]" : "border-white/[0.06] bg-white/[0.02]"
            }`}
          >
            <p className="text-sm font-medium">If every step loses</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total risked</p>
                <p className="mt-1 font-display text-xl font-semibold">{formatCurrency(cycleExposure, currency)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Largest single stake</p>
                <p className="mt-1 font-display text-xl font-semibold">{formatCurrency(worstRung, currency)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Losses to get there</p>
                <p className="mt-1 font-display text-xl font-semibold">{steps.length}</p>
              </div>
            </div>

            {exceedsBalance ? (
              <p className="mt-3 flex gap-2 text-xs leading-5 text-destructive">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  A full losing run costs more than your balance of {formatCurrency(balance, currency)}. The bot
                  will skip the steps it can&apos;t afford, so the ladder won&apos;t finish as designed.
                </span>
              </p>
            ) : (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {steps.length} losses in a row costs {formatCurrency(cycleExposure, currency)}. After the last
                step the bot returns to step 1 rather than raising further.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              disabled={!dirty || !baseValid || !stepsValid || save.isPending}
              onClick={() =>
                save.mutate({ baseAmount: base, martingaleSteps: numericSteps, martingaleEnabled: enabled })
              }
            >
              {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save settings
            </Button>

            {dirty ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDirty(false);
                  setEnabled(status.martingaleEnabled !== false);
                  setSteps((status.martingaleSteps ?? [1, 1, 2, 4, 8]).map(String));
                  setBaseAmount(String(status.baseAmount ?? 1));
                }}
              >
                Discard
              </Button>
            ) : null}

            {currentStep > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => save.mutate({ resetMartingaleStreak: true })}
                disabled={save.isPending}
                title="Go back to step 1 without waiting for a win"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset to step 1
              </Button>
            ) : null}
          </div>

          {!stepsValid || !baseValid ? (
            <p className="text-xs text-destructive">
              Every step and the base amount must be a number greater than zero.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
