"use client";

import Link from "next/link";
import { Copy, Lock, Plus, Trash2, Webhook as WebhookIcon } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { EmailNotice } from "@/components/ui/email-notice";
import { api } from "@/lib/api";
import { useFeatureAccess } from "@/hooks/use-feature-access";

interface WebhookToken {
  _id: string;
  token: string;
  isActive: boolean;
  url: string;
  message: string;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

export function WebhookCard() {
  const { isVip } = useFeatureAccess();
  const queryClient = useQueryClient();
  const [signalTarget, setSignalTarget] = useState<"iq" | "eo" | "both">("both");
  const [webhookToDelete, setWebhookToDelete] = useState<WebhookToken | null>(null);

  const { data: webhooks = [], isLoading } = useQuery<WebhookToken[]>({
    queryKey: ["webhooks"],
    queryFn: async () => (await api.get("/user/webhooks")).data,
    enabled: isVip,
  });

  const generateMutation = useMutation({
    mutationFn: async () => (await api.post("/user/webhooks")).data,
    onSuccess: () => {
      toast.success("Webhook token generated. A setup notification may be sent to your email.");
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toast.error(err?.response?.data?.message ?? "Failed to generate webhook"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/user/webhooks/${id}`, { isActive }),
    onSuccess: () => {
      toast.success("Webhook updated. A security notification may be sent to your email.");
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toast.error(err?.response?.data?.message ?? "Failed to update webhook"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/user/webhooks/${id}`),
    onSuccess: () => {
      toast.success("Webhook deleted. A security notification may be sent to your email.");
      setWebhookToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toast.error(err?.response?.data?.message ?? "Failed to delete webhook"),
  });

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
  }

  if (!isVip) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Webhook</h1>
          <p className="mt-1 text-sm text-muted-foreground">Receive external trading signals via webhook.</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <Lock className="mb-3 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">VIP plan required</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Upgrade to VIP to get a personal webhook URL for TradingView signals.</p>
          <Button asChild size="sm" variant="outline" className="mt-4">
            <Link href="/dashboard/subscription">View plans</Link>
          </Button>
        </div>
      </div>
    );
  }

  const baseTemplate = { ticker: "{{ticker}}", signal: "{{strategy.order.action}}", time: 60 };
  void (webhooks[0]?.message);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Webhook</h1>
          <p className="mt-1 text-sm text-muted-foreground">Receive TradingView signals via a personal webhook URL.</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || webhooks.length >= 5}
        >
          <Plus className="h-3.5 w-3.5" />
          {generateMutation.isPending ? "Generatingâ€¦" : "New token"}
        </Button>
      </div>

      <EmailNotice
        variant="warning"
        message="Changes to your webhook tokens may trigger account security notifications to your email."
        className="mb-2"
      />

      {isLoading && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center text-sm text-muted-foreground">
          Loading webhooksâ€¦
        </div>
      )}

      {!isLoading && webhooks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
          <WebhookIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No webhook tokens yet</p>
          <p className="mt-1 text-xs text-muted-foreground/50">
            Generate a token to start receiving signals from TradingView.
          </p>
          <Button
            size="sm"
            className="mt-4 gap-1.5"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            <Plus className="h-3.5 w-3.5" /> Generate token
          </Button>
        </div>
      )}

      {webhooks.map((wh) => (
        <div key={wh._id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <WebhookIcon className="h-4 w-4 shrink-0 text-primary/60" />
              <span className="text-sm font-semibold text-white">Endpoint</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{wh.usageCount} uses</span>
              <Switch
                checked={wh.isActive}
                onCheckedChange={(checked) => toggleMutation.mutate({ id: wh._id, isActive: checked })}
                disabled={toggleMutation.isPending}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => setWebhookToDelete(wh)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
            <code className="flex-1 break-all text-xs text-muted-foreground">{wh.url}</code>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => copy(wh.url, "URL")}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>

          {!wh.isActive && (
            <p className="mt-2 text-xs text-amber-400/80">
              This webhook is inactive â€” enable the toggle to receive signals.
            </p>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground/50">
            Created {format(new Date(wh.createdAt), "MMM d, yyyy")}
            {wh.lastUsedAt && ` Â· Last used ${format(new Date(wh.lastUsedAt), "MMM d, HH:mm")}`}
          </p>
        </div>
      ))}

      <ConfirmDialog
        open={Boolean(webhookToDelete)}
        onOpenChange={(open) => { if (!open) setWebhookToDelete(null); }}
        title="Delete webhook?"
        description="This webhook URL will stop accepting TradingView signals immediately."
        confirmLabel="Delete webhook"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (webhookToDelete) deleteMutation.mutate(webhookToDelete._id);
        }}
      />

      {webhooks.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
          {/* Target broker selector */}
          <div>
            <h3 className="text-sm font-semibold text-white">Signal Target</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Choose which broker(s) receive this webhook signal.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["iq", "eo", "both"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSignalTarget(t)}
                  className={`rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${
                    signalTarget === t
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"
                  }`}
                >
                  {t === "iq" ? "IQ Option" : t === "eo" ? "Expert Option" : "Both"}
                </button>
              ))}
            </div>
          </div>

          {/* Message template */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">TradingView Message Template</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Paste this into the &quot;Message&quot; field of your TradingView alert.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 shrink-0 gap-1.5 text-xs"
                onClick={() => copy(JSON.stringify({ ...baseTemplate, target: signalTarget }, null, 2), "Template")}
              >
                <Copy className="h-3 w-3" /> Copy
              </Button>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-white/[0.04] bg-black/30 p-4 text-xs text-muted-foreground">
              {JSON.stringify({ ...baseTemplate, target: signalTarget }, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h3 className="text-sm font-semibold text-white">How it works</h3>
        <ol className="mt-3 space-y-2">
          {[
            "Generate a webhook token above.",
            "In TradingView, create an alert and paste the webhook URL as the endpoint.",
            "Paste the message template into the alert's Message field.",
            "When your alert fires, NOJAI will execute the trade on your selected broker(s).",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                {i + 1}
              </span>
              <span className="text-xs text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
