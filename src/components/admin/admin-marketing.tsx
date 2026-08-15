"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Mail, Plus, RefreshCw, RotateCcw, Save, Send, TrendingUp, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

type Audience = "all" | "active_subscribers" | "non_subscribers";

const AUDIENCE_LABELS: Record<Audience, string> = {
  all: "All verified users",
  active_subscribers: "Active subscribers only",
  non_subscribers: "Non-subscribers only (win-back)",
};

interface RenderedCampaign {
  subject: string;
  eyebrow: string;
  title: string;
  intro: string;
  bullets: string[];
  ctaLabel: string;
  outro: string;
}

interface CampaignPreview {
  stats: {
    periodStart: string;
    periodEnd: string;
    totalProfitUsd: number;
    grossProfitUsd: number;
    grossLossUsd: number;
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
  rendered: RenderedCampaign;
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

interface Template {
  subject: string;
  eyebrow: string;
  title: string;
  intro: string;
  bullets: string[];
  ctaLabel: string;
  outro: string;
}

interface Placeholder {
  key: string;
  description: string;
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

const EMPTY_TEMPLATE: Template = { subject: "", eyebrow: "", title: "", intro: "", bullets: [], ctaLabel: "", outro: "" };

export function AdminMarketing() {
  const queryClient = useQueryClient();
  const [days, setDays] = useState(7);
  const [audience, setAudience] = useState<Audience>("non_subscribers");
  const [physicalAddress, setPhysicalAddress] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState<Template>(EMPTY_TEMPLATE);

  const previewQuery = useQuery<CampaignPreview>({
    queryKey: ["admin-marketing-preview", days, audience],
    queryFn: async () => (await api.get("/admin/marketing/profit-campaign/preview", { params: { days, audience } })).data,
  });

  const { data: campaignsData, isLoading: loadingCampaigns, refetch: refetchCampaigns } = useQuery<{ campaigns: Campaign[] }>({
    queryKey: ["admin-marketing-campaigns"],
    queryFn: async () => (await api.get("/admin/marketing/campaigns")).data,
    refetchInterval: 15000,
  });

  const templateQuery = useQuery<{ template: Template; placeholders: Placeholder[] }>({
    queryKey: ["admin-marketing-template"],
    queryFn: async () => (await api.get("/admin/marketing/profit-campaign/template")).data,
  });

  useEffect(() => {
    if (templateQuery.data?.template) setTemplateForm(templateQuery.data.template);
  }, [templateQuery.data]);

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

  const saveTemplateMutation = useMutation({
    mutationFn: async () => api.put("/admin/marketing/profit-campaign/template", templateForm),
    onSuccess: (res) => {
      toast.success("Template saved");
      setTemplateForm(res.data.template);
      queryClient.invalidateQueries({ queryKey: ["admin-marketing-template"] });
      queryClient.invalidateQueries({ queryKey: ["admin-marketing-preview"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to save template"),
  });

  const resetTemplateMutation = useMutation({
    mutationFn: async () => api.post("/admin/marketing/profit-campaign/template/reset"),
    onSuccess: (res) => {
      toast.success("Template reset to default");
      setTemplateForm(res.data.template);
      queryClient.invalidateQueries({ queryKey: ["admin-marketing-preview"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to reset template"),
  });

  function updateBullet(index: number, value: string) {
    setTemplateForm((prev) => ({ ...prev, bullets: prev.bullets.map((b, i) => (i === index ? value : b)) }));
  }
  function addBullet() {
    setTemplateForm((prev) => ({ ...prev, bullets: [...prev.bullets, ""] }));
  }
  function removeBullet(index: number) {
    setTemplateForm((prev) => ({ ...prev, bullets: prev.bullets.filter((_, i) => i !== index) }));
  }

  const preview = previewQuery.data;
  const canSend = Boolean(physicalAddress.trim()) && Boolean(preview?.recipientCount) && !preview?.unsafeToSend && !sendMutation.isPending;

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Send this campaign?"
        description={`This will email ${preview?.recipientCount ?? 0} recipient${preview?.recipientCount === 1 ? "" : "s"} (${AUDIENCE_LABELS[audience]}) with subject "${preview?.rendered.subject ?? ""}". Sends happen in throttled batches in the background. This cannot be recalled once sent.`}
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
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live preview — real numbers, actual email copy</p>
              {previewQuery.isLoading ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : preview ? (
                <div className="space-y-3">
                  <p className="text-sm italic text-foreground">&ldquo;{preview.rendered.subject}&rdquo;</p>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-white/[0.03] p-3">
                      <p className={`text-lg font-bold ${preview.stats.totalProfitUsd < 0 ? "text-red-400" : "text-primary"}`}>{money(preview.stats.totalProfitUsd)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Net</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] p-3">
                      <p className="text-lg font-bold text-emerald-400">{money(preview.stats.grossProfitUsd)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Gross profit</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] p-3">
                      <p className="text-lg font-bold text-red-400">-{money(preview.stats.grossLossUsd)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Gross loss</p>
                    </div>
                  </div>
                  <p className="text-center text-[11px] text-muted-foreground">Net = Gross profit − Gross loss. This is the real, honest bottom line — winners' gains minus losers' losses across the whole platform for this period.</p>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-xl bg-white/[0.03] p-3">
                      <p className="text-lg font-bold text-foreground">{preview.stats.winRate}%</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Win rate</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] p-3">
                      <p className="text-lg font-bold text-foreground">{preview.stats.activeTraders}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Traders</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.05] bg-black/10 p-3">
                    <p className="text-sm font-semibold text-foreground">{preview.rendered.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{preview.rendered.intro}</p>
                    <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                      {preview.rendered.bullets.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Email template</CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                if (window.confirm("Reset the email template to the default copy? Your edits will be lost.")) {
                  resetTemplateMutation.mutate();
                }
              }}
              disabled={resetTemplateMutation.isPending}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset to default
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {templateQuery.isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {(templateQuery.data?.placeholders ?? []).map((p) => (
                  <span key={p.key} title={p.description} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] text-primary">
                    {p.key}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">Use any of the placeholders above in any field below — they get replaced with the real computed numbers when a campaign is sent.</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email subject</Label>
                  <Input value={templateForm.subject} onChange={(e) => setTemplateForm((p) => ({ ...p, subject: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Eyebrow (small label above title)</Label>
                  <Input value={templateForm.eyebrow} onChange={(e) => setTemplateForm((p) => ({ ...p, eyebrow: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Title (large heading)</Label>
                <Input value={templateForm.title} onChange={(e) => setTemplateForm((p) => ({ ...p, title: e.target.value }))} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Intro paragraph</Label>
                <Textarea rows={2} value={templateForm.intro} onChange={(e) => setTemplateForm((p) => ({ ...p, intro: e.target.value }))} className="resize-none" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Bullet points</Label>
                {templateForm.bullets.map((bullet, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={bullet} onChange={(e) => updateBullet(i, e.target.value)} className="flex-1" />
                    <button
                      type="button"
                      aria-label="Remove bullet"
                      onClick={() => removeBullet(i)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addBullet} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add bullet
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Button text</Label>
                  <Input value={templateForm.ctaLabel} onChange={(e) => setTemplateForm((p) => ({ ...p, ctaLabel: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Outro / disclaimer</Label>
                <Textarea rows={2} value={templateForm.outro} onChange={(e) => setTemplateForm((p) => ({ ...p, outro: e.target.value }))} className="resize-none" />
                <p className="text-[11px] text-muted-foreground">Keep a risk disclaimer here — this is a trading platform, and an unqualified profit claim is a compliance risk.</p>
              </div>

              <Button className="w-full gap-2" onClick={() => saveTemplateMutation.mutate()} disabled={saveTemplateMutation.isPending}>
                <Save className="h-4 w-4" />
                {saveTemplateMutation.isPending ? "Saving..." : "Save Template"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
