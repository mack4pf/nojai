"use client";

import Link from "next/link";
import Image from "next/image";
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

export function WebhookCard({ hideTitleHeader, olympFreeMode = false }: { hideTitleHeader?: boolean; olympFreeMode?: boolean } = {}) {
  const { isVip, isPro } = useFeatureAccess();
  const hasAccess = isVip || isPro || olympFreeMode;
  const maxWebhooks = isVip && !olympFreeMode ? 5 : 1;
  const queryClient = useQueryClient();
  const [signalTarget, setSignalTarget] = useState<"iq" | "eo" | "olymp" | "all">(olympFreeMode ? "olymp" : "all");
  const [webhookToDelete, setWebhookToDelete] = useState<WebhookToken | null>(null);

  const { data: webhooks = [], isLoading } = useQuery<WebhookToken[]>({
    queryKey: ["webhooks"],
    queryFn: async () => (await api.get("/user/webhooks")).data,
    enabled: hasAccess,
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

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        {!hideTitleHeader && (
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Webhook</h1>
            <p className="mt-1 text-sm text-muted-foreground">Receive external trading signals via webhook.</p>
          </div>
        )}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <Lock className="mb-3 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">PRO or VIP plan required</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Upgrade to PRO or VIP to get a personal webhook URL for TradingView signals.</p>
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
        {!hideTitleHeader && (
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Webhook</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Receive TradingView signals via a personal webhook URL.
              {olympFreeMode
                ? <span className="ml-1 text-muted-foreground/60">(1 Olymp Trade webhook on the free tier)</span>
                : isPro && !isVip && <span className="ml-1 text-muted-foreground/60">(1 webhook on PRO plan)</span>}
            </p>
          </div>
        )}
        <Button
          size="sm"
          className="gap-1.5 ml-auto"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || webhooks.length >= maxWebhooks}
        >
          <Plus className="h-3.5 w-3.5" />
          {generateMutation.isPending ? "Generating…" : "New token"}
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
            Generate a token to start receiving signals.
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
              This webhook is inactive — enable the toggle to receive signals.
            </p>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground/50">
            Created {format(new Date(wh.createdAt), "MMM d, yyyy")}
            {wh.lastUsedAt && ` · Last used ${format(new Date(wh.lastUsedAt), "MMM d, HH:mm")}`}
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
            <p className="mt-0.5 text-xs text-muted-foreground">Choose which broker(s) receive this signal.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(olympFreeMode ? [
                { value: "olymp" as const, label: "Olymp Trade", icon: "/autobot-assets/olymptrade.jpeg", rounded: true },
              ] : [
                { value: "iq" as const, label: "IQ Option", icon: "/autobot-assets/iq-option-small.svg", rounded: false },
                { value: "eo" as const, label: "ExpertOption", icon: "/autobot-assets/experoptionlogo.png", rounded: false },
                { value: "olymp" as const, label: "Olymp Trade", icon: "/autobot-assets/olymptrade.jpeg", rounded: true },
                { value: "all" as const, label: "All", icon: null, rounded: false },
              ]).map((targetOption) => (
                <button
                  key={targetOption.value}
                  onClick={() => setSignalTarget(targetOption.value)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${
                    signalTarget === targetOption.value
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"
                  }`}
                >
                  {targetOption.icon ? (
                    <span className="flex h-4 w-4 items-center justify-center overflow-hidden rounded-full bg-white p-0.5">
                      <Image
                        src={targetOption.icon}
                        alt={targetOption.label}
                        width={14}
                        height={14}
                        className={`h-full w-full ${targetOption.rounded ? "rounded-full object-cover" : "object-contain"}`}
                      />
                    </span>
                  ) : null}
                  {targetOption.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground/60">
              {olympFreeMode
                ? "Olymp Trade free tier webhooks send TradingView signals only to your approved Olymp Trade account."
                : "All sends one signal to every connected Binary Options broker: IQ Option, ExpertOption, and Olymp Trade."}
            </p>
          </div>

          {/* Message template */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">JSON Message Format</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Send this JSON body to your webhook URL when a signal fires.
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
            "In your signal platform, create an alert and paste the webhook URL as the endpoint.",
            "Set the alert message body to the JSON format shown above.",
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
