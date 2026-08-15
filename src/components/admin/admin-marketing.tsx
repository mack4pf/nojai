"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Mail, RefreshCw, Send, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

type Audience = "all" | "active_subscribers" | "non_subscribers";

const AUDIENCE_LABELS: Record<Audience, string> = {
  all: "All verified users",
  active_subscribers: "Active subscribers only",
  non_subscribers: "Non-subscribers only (win-back)",
};

interface CampaignPreview {
  stats: {
    periodStart: string;
    periodEnd: string;
    totalProfitUsd: number;
    activeTraders: number;
    winRate: number;
    tradeCount: number;
    excludedTradeCount: number;
    excludedCurrencies: string[];
  };
  audience: Audience;
  recipientCount: number;
  unsafeToSend: boolean;
  unsafeReason?: string;
  sampleSubject: string;
}

interface Campaign {
  _id: string;
  status: "sending" | "completed" | "failed";
  periodStart: string;
  periodEnd: string;
  stats: { totalProfit: number; currency: string; activeTraders: number; winRate: number };
  audience: Audience;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  startedAt: string;
  completedAt?: string;
  sentBy?: { email: string; fullName?: string };
}

const STATUS_VARIANT: Record<Campaign["status"], "success" | "warning" | "outline"> = {
  completed: "success",
  sending: "outline",
  failed: "warning",
};

function money(value: number) {
  const abs = Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return value < 0 ? `-$${abs}` : `$${abs}`;
}

export function AdminMarketing() {
  const queryClient = useQueryClient();
  const [days, setDays] = useState(7);
  const [audience, setAudience] = useState<Audience>("non_subscribers");
  const [physicalAddress, setPhysicalAddress] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const previewQuery = useQuery<CampaignPreview>({
    queryKey: ["admin-marketing-preview", days, audience],
    queryFn: async () => (await api.get("/admin/marketing/profit-campaign/preview", { params: { days, audience } })).data,
  });

  const { data: campaignsData, isLoading: loadingCampaigns, refetch: refetchCampaigns } = useQuery<{ campaigns: Campaign[] }>({
    queryKey: ["admin-marketing-campaigns"],
    queryFn: async () => (await api.get("/admin/marketing/campaigns")).data,
    refetchInterval: 15000,
  });

  const sendMutation = useMutation({
    mutationFn: async () =>
      api.post("/admin/marketing/profit-campaign/send", { days, audience, physicalAddress }),
    onSuccess: (res) => {
      toast.success(res.data.message ?? "Campaign started");
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-marketing-campaigns"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to send campaign"),
  });

  const preview = previewQuery.data;
  const canSend = Boolean(physicalAddress.trim()) && Boolean(preview?.recipientCount) && !preview?.unsafeToSend && !sendMutation.isPending;

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Send this campaign?"
        description={`This will email ${preview?.recipientCount ?? 0} recipient${preview?.recipientCount === 1 ? "" : "s"} (${AUDIENCE_LABELS[audience]}) showing ${preview ? money(preview.stats.totalProfitUsd) : "$0"} in platform profit over the last ${days} days. Sends happen in throttled batches in the background. This cannot be recalled once sent.`}
        confirmLabel={sendMutation.isPending ? "Sending..." : "Send Campaign"}
        loading={sendMutation.isPending}
        onConfirm={() => sendMutation.mutate()}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Growth</p>
          <h1 className="font-display text-3xl font-bold text-foreground">Marketing Campaigns</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Send a real, computed platform-performance email to drive signups. Every send respects unsubscribes and includes the required footer disclosures.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Build campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Period</Label>
                <select
                  className="h-11 w-full rounded-2xl border border-input bg-background/70 px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Audience</Label>
                <select
                  className="h-11 w-full rounded-2xl border border-input bg-background/70 px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as Audience)}
                >
                  {(Object.keys(AUDIENCE_LABELS) as Audience[]).map((key) => (
                    <option key={key} value={key}>{AUDIENCE_LABELS[key]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Physical mailing address</Label>
              <Input
                placeholder="Required by law for marketing emails (CAN-SPAM / PECR)"
                value={physicalAddress}
                onChange={(e) => setPhysicalAddress(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Shown in the email footer. A registered business address, virtual mailbox, or PO box all satisfy this.</p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live preview</p>
              {previewQuery.isLoading ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : preview ? (
                <div className="space-y-3">
                  <p className="text-sm italic text-foreground">&ldquo;{preview.sampleSubject}&rdquo;</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-white/[0.03] p-3">
                      <p className="text-lg font-bold text-primary">{money(preview.stats.totalProfitUsd)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Profit</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] p-3">
                      <p className="text-lg font-bold text-foreground">{preview.stats.winRate}%</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Win rate</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] p-3">
                      <p className="text-lg font-bold text-foreground">{preview.stats.activeTraders}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Traders</p>
                    </div>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> {preview.recipientCount} recipient{preview.recipientCount === 1 ? "" : "s"} will receive this ({AUDIENCE_LABELS[audience]})
                  </p>
                  {preview.recipientCount === 0 ? (
                    <p className="text-xs text-warning">No eligible recipients for this audience right now — nothing would be sent.</p>
                  ) : null}
                  {preview.unsafeToSend ? (
                    <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.08] p-3 text-xs text-red-200">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                      <span>{preview.unsafeReason}</span>
                    </div>
                  ) : preview.unsafeReason ? (
                    <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/[0.08] p-3 text-xs text-warning">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{preview.unsafeReason}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <Button className="w-full gap-2" onClick={() => setConfirmOpen(true)} disabled={!canSend}>
              <Send className="h-4 w-4" />
              Send Campaign
            </Button>
            {!physicalAddress.trim() ? (
              <p className="text-center text-[11px] text-warning">Enter a mailing address to enable sending.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Campaign history</CardTitle>
              <Button variant="outline" size="sm" onClick={() => refetchCampaigns()} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingCampaigns ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (campaignsData?.campaigns ?? []).length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Mail className="h-8 w-8 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">No campaigns sent yet.</p>
              </div>
            ) : (
              (campaignsData?.campaigns ?? []).map((c) => (
                <div key={c._id} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <TrendingUp className="h-4 w-4 text-primary" /> {money(c.stats.totalProfit)} profit campaign
                    </p>
                    <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {AUDIENCE_LABELS[c.audience]} · {formatDate(c.periodStart, "MMM d")} – {formatDate(c.periodEnd, "MMM d")}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {c.sentCount}/{c.recipientCount} sent{c.failedCount > 0 ? `, ${c.failedCount} failed` : ""} · started {formatDate(c.startedAt, "MMM d · HH:mm")}
                    {c.sentBy?.email ? ` · by ${c.sentBy.fullName ?? c.sentBy.email}` : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
