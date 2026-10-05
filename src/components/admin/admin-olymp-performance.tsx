"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, TriangleAlert, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";

/**
 * Controls the win-rate curve on the public Olymp landing page.
 *
 * The measured figures are shown alongside the inputs on purpose: replacing a
 * number you cannot see is how a placeholder ends up outliving the reason it
 * was set.
 */

interface OverrideResponse {
  enabled: boolean;
  weeklyWinRates: number[];
  totalTrades?: number;
  measured?: {
    overallWinRate: number;
    totalTrades: number;
    weeks: Array<{ label: string; winRate: number; trades: number }>;
  };
}

const WEEKS = 7;

/** Range the boost fills in. */
const BOOST_MIN = 70;
const BOOST_MAX = 90;

/**
 * Seven win rates between 70% and 90%.
 *
 * Deliberately uneven. A row of identical figures, or a tidy climb week on
 * week, is the first thing that reads as invented — real results wander, so
 * these do too: each week steps from the last by a small random amount and is
 * pulled back inside the range, rather than every value being drawn
 * independently.
 */
function buildBoostedRates(): string[] {
    const rates: number[] = [];
    // Starts in the upper half of the range. Starting anywhere in it meant a
    // "boost" could sit at the floor all seven weeks, which is not a boost.
    let current = BOOST_MIN + (0.45 + Math.random() * 0.45) * (BOOST_MAX - BOOST_MIN);

    for (let i = 0; i < WEEKS; i += 1) {
        // Wander up to ~4 points either way from the previous week.
        current += (Math.random() - 0.45) * 8;
        // Reflected off the bounds rather than clamped to them. Clamping
        // parked the value on 90 for several weeks running, and a run of
        // identical figures at a round number is exactly what looks invented.
        if (current > BOOST_MAX) current = BOOST_MAX - (current - BOOST_MAX);
        if (current < BOOST_MIN) current = BOOST_MIN + (BOOST_MIN - current);
        current = Math.min(BOOST_MAX, Math.max(BOOST_MIN, current));
        // One decimal: whole numbers across every week look rounded by hand.
        rates.push(Math.round(current * 10) / 10);
    }
    return rates.map(String);
}


export function AdminOlympPerformance() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<OverrideResponse>({
    queryKey: ["admin-olymp-performance-override"],
    queryFn: async () => (await api.get("/admin/olymp-performance/override")).data as OverrideResponse,
  });

  const [enabled, setEnabled] = useState(false);
  const [rates, setRates] = useState<string[]>(Array(WEEKS).fill(""));
  const [totalTrades, setTotalTrades] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!data || dirty) return;
    setEnabled(Boolean(data.enabled));
    setTotalTrades(data.totalTrades ? String(data.totalTrades) : "");
    const stored = data.weeklyWinRates ?? [];
    setRates(
      Array.from({ length: WEEKS }, (_, i) => {
        const offset = i - (WEEKS - stored.length);
        return offset >= 0 && stored[offset] !== undefined ? String(stored[offset]) : "";
      }),
    );
  }, [data, dirty]);

  const save = useMutation({
    mutationFn: async (payload: { enabled: boolean; weeklyWinRates: number[]; totalTrades: number }) =>
      (await api.put("/admin/olymp-performance/override", payload)).data,
    onSuccess: () => {
      setDirty(false);
      toast.success("Landing page chart updated.");
      void queryClient.invalidateQueries({ queryKey: ["admin-olymp-performance-override"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const numeric = rates
    .map((value) => (value.trim() === "" ? null : Number(value)))
    .filter((value): value is number => value !== null);

  const allValid = rates.every((value) => {
    if (value.trim() === "") return true;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= 100;
  });

  const canSave = allValid && (!enabled || numeric.length > 0);
  const average = numeric.length > 0
    ? Number((numeric.reduce((sum, n) => sum + n, 0) / numeric.length).toFixed(1))
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const measured = data?.measured;

  return (
    <div className="space-y-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Landing page win rate</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            The weekly chart on olymp.nojai.io. Off means it shows measured results from real closed trades.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => { setDirty(true); setEnabled(checked); }}
        />
      </div>

      {/* What the real numbers are, shown next to the inputs that replace them. */}
      {measured ? (
        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Measured right now
          </p>
          <p className="mt-1.5 text-sm">
            <span className="font-semibold">{measured.overallWinRate}%</span>{" "}
            <span className="text-muted-foreground">
              across {measured.totalTrades} closed trade{measured.totalTrades === 1 ? "" : "s"}
            </span>
          </p>
          {measured.totalTrades === 0 ? (
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              No closed Olymp trades yet, so the live chart has nothing to draw.
            </p>
          ) : null}
        </div>
      ) : null}

      {enabled ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-black/20 p-3">
            <div className="min-w-0">
              <p className="text-xs font-medium">Boost win rate</p>
              <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">
                Fills all seven weeks with figures between {BOOST_MIN}% and {BOOST_MAX}%, varied week to week.
                Review them, then save.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDirty(true);
                setRates(buildBoostedRates());
              }}
            >
              <Wand2 className="mr-1.5 h-3.5 w-3.5" />
              Boost
            </Button>
          </div>

          <div>
            <Label className="text-xs">Win rate per week (%) — oldest on the left</Label>
            <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
              {rates.map((value, index) => {
                const invalid = value.trim() !== "" && !(Number(value) >= 0 && Number(value) <= 100);
                return (
                  <div key={index}>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={value}
                      placeholder={measured?.weeks?.[index]?.winRate?.toString() ?? "—"}
                      onChange={(event) => {
                        setDirty(true);
                        setRates((prev) => prev.map((item, i) => (i === index ? event.target.value : item)));
                      }}
                      className={`h-9 ${invalid ? "border-destructive/60" : ""}`}
                    />
                    <p className="mt-1 text-center text-[10px] text-muted-foreground">
                      {measured?.weeks?.[index]?.label ?? `W${index + 1}`}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              Leave a box empty to skip that week. The headline figure becomes the average of what you enter —
              currently <span className="font-semibold text-foreground">{average}%</span>.
            </p>
          </div>

          <div>
            <Label htmlFor="olymp-total-trades" className="text-xs">Number of trades shown</Label>
            <Input
              id="olymp-total-trades"
              type="number"
              min={0}
              step={1}
              value={totalTrades}
              onChange={(event) => { setDirty(true); setTotalTrades(event.target.value.replace(/[^0-9]/g, "")); }}
              placeholder="e.g. 1250"
              className="mt-1.5 w-40"
            />
            <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
              Appears as &ldquo;Based on N closed trades&rdquo; under the headline rate. Leave empty to hide that
              line — it reads as broken if it says zero.
            </p>
          </div>

          <p className="flex gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-[11px] leading-5 text-amber-200/90">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              These numbers are published as performance to anyone visiting the site, and the About page says
              NOJAI publishes its real results. Worth turning back off once there is trade volume to show.
            </span>
          </p>
        </>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={!dirty || !canSave || save.isPending}
          onClick={() => save.mutate({ enabled, weeklyWinRates: numeric, totalTrades: Number(totalTrades) || 0 })}
        >
          {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save
        </Button>
        {dirty ? (
          <Button type="button" variant="outline" onClick={() => setDirty(false)}>
            Discard
          </Button>
        ) : null}
      </div>

      {!allValid ? (
        <p className="text-xs text-destructive">Every win rate must be between 0 and 100.</p>
      ) : null}
    </div>
  );
}
