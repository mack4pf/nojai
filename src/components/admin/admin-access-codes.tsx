"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, RefreshCw, Users, Link as LinkIcon, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  const [showRedemptions, setShowRedemptions] = useState(false);
  const status = getStatus(code);

  const { data: redemptions = [], isLoading: isLoadingRedemptions } = useQuery<any[]>({
    queryKey: ["access-code-redemptions", code._id],
    queryFn: async () => {
      const res = await api.get(`/admin/codes/${code._id}/redemptions`);
      return res.data.redemptions || [];
    },
    enabled: showRedemptions,
  });

  function copy() {
    void navigator.clipboard.writeText(code.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Code copied to clipboard");
    });
  }

  const usedByEmail = typeof code.usedBy === "object" && code.usedBy !== null ? (code.usedBy as { email: string }).email : null;
  const createdByEmail = typeof code.createdBy === "object" && code.createdBy !== null ? (code.createdBy as { email: string }).email : null;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`font-mono text-sm font-semibold tracking-wider ${code.isGlobal ? "text-primary" : ""}`}>{code.code}</span>
            <button type="button" aria-label="Copy code" onClick={copy} className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {code.isGlobal && <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">Marketing</Badge>}
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Plan: <span className="text-foreground font-medium">{String(code.plan).toUpperCase()}</span></span>
          {code.durationDays ? <span>Duration: {code.durationDays}d</span> : null}
          <span>Expires: {formatDate(code.expiresAt)}</span>
          {code.isGlobal ? (
            <span className="text-primary font-medium">Redemptions: {code.usedCount ?? 0} / {code.maxUses || "∞"}</span>
          ) : usedByEmail ? (
            <span>Used by: {usedByEmail}</span>
          ) : null}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
          <p className="text-[10px] text-muted-foreground italic">
            Created by: {createdByEmail || "System"}
          </p>
          {code.isGlobal && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowRedemptions(!showRedemptions)}
              className="h-7 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10"
            >
              {showRedemptions ? "Hide Usage" : "View Usage"}
              <Users className="ml-1.5 h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {showRedemptions && (
        <div className="bg-black/20 border-t border-white/[0.05] p-4 animate-fade-up">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Users className="h-3.5 w-3.5" /> Recent Redemptions
          </h4>
          
          {isLoadingRedemptions ? (
            <div className="py-4 text-center text-xs text-muted-foreground">Loading redemptions...</div>
          ) : redemptions.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">No redemptions yet.</div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1.5fr_1fr] gap-2 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 pb-1">
                <span>Name</span>
                <span>Email</span>
                <span className="text-right">Date</span>
              </div>
              {redemptions.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_1.5fr_1fr] gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02] text-xs items-center">
                  <span className="font-medium text-foreground truncate">{r.userId?.fullName || "—"}</span>
                  <span className="text-muted-foreground truncate">{r.userId?.email || r.userEmail || "—"}</span>
                  <span className="text-right text-[10px] text-muted-foreground">{formatDate(r.redeemedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminAccessCodes() {
  const queryClient = useQueryClient();
  const [plan, setPlan] = useState<Plan>("standard");
  const [lastGenerated, setLastGenerated] = useState<AccessCode | null>(null);
  const [copied, setCopied] = useState(false);
  const [filterPlan, setFilterPlan] = useState<Plan | "all">("all");
  const [isGlobal, setIsGlobal] = useState(false);
  const [maxUses, setMaxUses] = useState<string>("");
  const [customCode, setCustomCode] = useState("");
  const [durationDays, setDurationDays] = useState<string>("30");

  const { data: codes = [], isLoading } = useQuery<AccessCode[]>({
    queryKey: ["admin-access-codes"],
    queryFn: async () => {
      const res = await api.get("/admin/codes");
      return Array.isArray(res.data) ? (res.data as AccessCode[]) : [];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/admin/codes", { 
        plan,
        isGlobal,
        maxUses: isGlobal && maxUses ? parseInt(maxUses) : undefined,
        code: customCode.trim() || undefined,
        durationDays: durationDays ? parseInt(durationDays) : 30
      });
      return res.data as AccessCode;
    },
    onSuccess: (data) => {
      setLastGenerated(data);
      toast.success("Access code created");
      queryClient.invalidateQueries({ queryKey: ["admin-access-codes"] });
      // Clear inputs
      setCustomCode("");
      if (!isGlobal) setMaxUses("");
    },
    onError: (error: Error) => toast.error(error.message ?? "Failed to create code"),
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
        <CardHeader><CardTitle>Create Access Code</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Plan Tier</Label>
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

          <div className="space-y-4 pt-2 border-t border-white/[0.05]">
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.01] p-3">
              <div className="space-y-0.5">
                <Label htmlFor="global-toggle" className="text-sm font-medium">Global / Marketing Code</Label>
                <p className="text-[10px] text-muted-foreground">Allows multiple users to redeem same code</p>
              </div>
              <Switch id="global-toggle" checked={isGlobal} onCheckedChange={setIsGlobal} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-xs font-medium text-muted-foreground">Duration (Days)</Label>
                <Input 
                  id="duration" 
                  type="number" 
                  placeholder="30" 
                  value={durationDays} 
                  onChange={(e) => setDurationDays(e.target.value)}
                />
              </div>
              {isGlobal && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="max-uses" className="text-xs font-medium text-muted-foreground">Max Redemptions</Label>
                  <Input 
                    id="max-uses" 
                    type="number" 
                    placeholder="Infinite if blank" 
                    value={maxUses} 
                    onChange={(e) => setMaxUses(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-code" className="text-xs font-medium text-muted-foreground">Custom Code Name (Optional)</Label>
              <Input 
                id="custom-code" 
                placeholder="e.g. FREE_MONTH_2026" 
                value={customCode} 
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                className="font-mono uppercase tracking-wider"
              />
              <p className="text-[10px] text-muted-foreground">Leave blank to auto-generate a random code.</p>
            </div>
          </div>

          <Button className="w-full h-11" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? "Processing..." : "Create Access Code"}
          </Button>

          {lastGenerated ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 space-y-3 animate-fade-up">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <ClipboardCheck className="h-3.5 w-3.5" /> Successfully Created
                </p>
                {lastGenerated.isGlobal && <Badge className="h-5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px]">GLOBAL</Badge>}
              </div>
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
                {lastGenerated.isGlobal && <p>Max Uses: {lastGenerated.maxUses || "Unlimited"}</p>}
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