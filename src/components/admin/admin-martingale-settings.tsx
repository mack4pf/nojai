"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BotOption {
  _id: string;
  name: string;
  isActive: boolean;
}

interface BotMartingale {
  _id: string;
  name: string;
  slug: string;
  status: string;
  martingaleSteps: number[];
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

export function AdminMartingaleSettings() {
  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const [stepsInput, setStepsInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [saved, setSaved] = useState(false);

  // Load bot list
  const { data: bots, isLoading: botsLoading } = useQuery<BotOption[]>({
    queryKey: ["admin-bots-list"],
    queryFn: async () => {
      const res = await api.get("/admin/bots");
      const arr = Array.isArray(res.data) ? res.data : (res.data?.bots ?? []);
      return arr;
    },
  });

  // Auto-select first bot
  useEffect(() => {
    if (bots && bots.length > 0 && !selectedBotId) {
      setSelectedBotId(String(bots[0]._id));
    }
  }, [bots, selectedBotId]);

  // Load selected bot martingale
  const { data: botMart, isLoading: martLoading } = useQuery<BotMartingale>({
    queryKey: ["admin-bot-martingale", selectedBotId],
    queryFn: async () => {
      const res = await api.get(`/admin/bots/${selectedBotId}/martingale`);
      return res.data;
    },
    enabled: Boolean(selectedBotId),
  });

  // Sync input when bot data loads
  useEffect(() => {
    if (botMart?.martingaleSteps) {
      setStepsInput(stepsToString(botMart.martingaleSteps));
      setInputError("");
      setSaved(false);
    }
  }, [botMart]);

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (steps: number[]) => {
      await api.put(`/admin/bots/${selectedBotId}/martingale`, { martingaleSteps: steps });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bot-martingale", selectedBotId] });
      toast.success("Bot martingale steps updated");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed to save"),
  });

  function handleSave() {
    const parsed = parseStepsInput(stepsInput);
    if (!parsed) {
      setInputError("Enter positive numbers separated by commas, e.g. 1, 1, 2, 4");
      return;
    }
    setInputError("");
    saveMutation.mutate(parsed);
  }

  const isLoading = botsLoading || martLoading;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-base font-bold">Bot Martingale Steps</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Set the default martingale multiplier sequence for a bot. This becomes the source of truth for all accounts unless a VIP user has set a personal override.
        </p>
      </div>

      {/* Bot selector */}
      <div className="space-y-1.5">
        <Label>Select Bot</Label>
        {botsLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading bots…
          </div>
        ) : (
          <div className="relative w-full max-w-xs">
            <select
              value={selectedBotId}
              onChange={(e) => setSelectedBotId(e.target.value)}
              className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 pr-8 text-sm text-foreground outline-none focus:border-white/20 focus:ring-0"
            >
              {(bots ?? []).map((b) => (
                <option key={b._id} value={b._id} className="bg-background">
                  {b.name} {b.isActive ? "" : "(inactive)"}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Bot info & editor */}
      {selectedBotId && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-5">
          {martLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : botMart ? (
            <>
              {/* Bot status row */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-foreground">{botMart.name}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                  botMart.status === "active"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-white/[0.08] text-muted-foreground"
                }`}>
                  {botMart.status}
                </span>
                {botMart.defaultDuration && (
                  <span className="text-xs text-muted-foreground">Default duration: {botMart.defaultDuration} days</span>
                )}
              </div>

              {/* Current steps display */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Current Steps</p>
                <div className="flex flex-wrap gap-2">
                  {botMart.martingaleSteps.map((s, i) => (
                    <span key={i} className="rounded-lg bg-white/[0.06] px-3 py-1 font-mono text-sm font-semibold text-foreground">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Steps editor */}
              <div className="space-y-2">
                <Label>Edit Steps (comma-separated positive numbers)</Label>
                <Input
                  value={stepsInput}
                  onChange={(e) => {
                    setStepsInput(e.target.value);
                    setInputError("");
                    setSaved(false);
                  }}
                  placeholder="e.g. 1, 1, 2, 4, 8"
                  className="max-w-sm font-mono"
                />
                {inputError && <p className="text-xs text-red-400">{inputError}</p>}
                <p className="text-[11px] text-muted-foreground">
                  Order is preserved exactly as entered. All values must be positive numbers.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  size="sm"
                >
                  {saveMutation.isPending ? (
                    <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Saving…</>
                  ) : "Save Steps"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStepsInput(stepsToString(botMart.martingaleSteps));
                    setInputError("");
                  }}
                  disabled={saveMutation.isPending}
                >
                  <RotateCcw className="mr-1.5 h-3 w-3" />
                  Reset
                </Button>
                {saved && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
