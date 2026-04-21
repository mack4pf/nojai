"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { AccessCode } from "@/types";

type Plan = "standard" | "pro" | "vip";

const PLAN_LABELS: Record<Plan, string> = { standard: "Standard", pro: "Pro", vip: "VIP" };

function getStatus(code: AccessCode): { label: string; variant: "default" | "secondary" | "warning" | "success" } {
  if (code.usedBy) return { label: "Used", variant: "secondary" };
  if (code.active === false) return { label: "Inactive", variant: "warning" };
  if (new Date(code.expiresAt) < new Date()) return { label: "Expired", variant: "warning" };
  return { label: "Active", variant: "success" };
}

function CodeRow({ code }: { code: AccessCode }) {
  const [copied, setCopied] = useState(false);
  const status = getStatus(code);

  function copy() {
    void navigator.clipboard.writeText(code.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const usedByEmail = typeof code.usedBy === "object" && code.usedBy !== null ? (code.usedBy as { email: string }).email : null;
  const createdByEmail = typeof code.createdBy === "object" && code.createdBy !== null ? (code.createdBy as { email: string }).email : null;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold tracking-wider">{code.code}</span>
          <button type="button" aria-label="Copy code" onClick={copy} className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Plan: <span className="text-foreground font-medium">{String(code.plan).toUpperCase()}</span></span>
        {code.durationDays ? <span>Duration: {code.durationDays}d</span> : null}
        <span>Expires: {formatDate(code.expiresAt)}</span>
        {usedByEmail ? <span>Used by: {usedByEmail}</span> : null}
        {createdByEmail ? <span>Created by: {createdByEmail}</span> : null}
      </div>
    </div>
  );
}

export function AdminAccessCodes() {
  const queryClient = useQueryClient();
  const [plan, setPlan] = useState<Plan>("standard");
  const [lastGenerated, setLastGenerated] = useState<AccessCode | null>(null);
  const [copied, setCopied] = useState(false);
  const [filterPlan, setFilterPlan] = useState<Plan | "all">("all");

  const { data: codes = [], isLoading } = useQuery<AccessCode[]>({
    queryKey: ["admin-access-codes"],
    queryFn: async () => {
      const res = await api.get("/admin/codes");
      return Array.isArray(res.data) ? (res.data as AccessCode[]) : [];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/admin/codes", { plan });
      return res.data as AccessCode;
    },
    onSuccess: (data) => {
      setLastGenerated(data);
      toast.success("Access code generated");
      queryClient.invalidateQueries({ queryKey: ["admin-access-codes"] });
    },
    onError: (error: Error) => toast.error(error.message ?? "Failed to generate code"),
  });

  function copyGenerated() {
    if (!lastGenerated) return;
    void navigator.clipboard.writeText(lastGenerated.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const visibleCodes = filterPlan === "all" ? codes : codes.filter((c) => String(c.plan).toLowerCase() === filterPlan);

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      {/* Generator */}
      <Card>
        <CardHeader><CardTitle>Generate Access Code</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Plan</p>
            <div className="flex flex-col gap-2">
              {(["standard", "pro", "vip"] as Plan[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors ${
                    plan === p ? "border-primary/40 bg-primary/[0.08] text-foreground" : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/10 hover:text-foreground"
                  }`}
                >
                  <span className="font-medium">{PLAN_LABELS[p]}</span>
                  {plan === p && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Duration is automatically set from the active pricing config for the selected plan.</p>
          <Button className="w-full" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? "Generating..." : "Generate Code"}
          </Button>
          {lastGenerated ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Code Generated</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold tracking-widest text-foreground">{lastGenerated.code}</span>
                <button type="button" aria-label="Copy" onClick={copyGenerated} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors">
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Plan: <span className="text-foreground">{String(lastGenerated.plan).toUpperCase()}</span></p>
                {lastGenerated.durationDays ? <p>Duration: {lastGenerated.durationDays} days</p> : null}
                <p>Expires: {formatDate(lastGenerated.expiresAt)}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Code list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Access Codes ({visibleCodes.length})</CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value as Plan | "all")}
                className="h-8 rounded-lg border border-white/[0.08] bg-background/60 px-2 text-xs text-muted-foreground"
              >
                <option value="all">All plans</option>
                <option value="standard">Standard</option>
                <option value="pro">Pro</option>
                <option value="vip">VIP</option>
              </select>
              <button
                type="button"
                aria-label="Refresh list"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-access-codes"] })}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
          ) : visibleCodes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No access codes yet.</p>
          ) : (
            visibleCodes.map((code) => <CodeRow key={code.code} code={code} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}