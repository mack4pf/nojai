"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

type Broker = "iq" | "eo" | "olymp";

const BROKER_LABELS: Record<Broker, string> = {
  iq: "IQ Option",
  eo: "Expert Option",
  olymp: "Olymp Trade",
};

const DURATION_LABELS: Record<number, string> = {
  60: "1 min",
  180: "3 min",
  300: "5 min",
  900: "15 min",
  1800: "30 min",
};

interface DurationsResponse {
  durations: Record<Broker, number>;
  allowedSeconds: number[];
}

interface WebhooksResponse {
  webhooks: Array<{ broker: Broker; url: string }>;
}

function WebhookRow({ broker, url }: { broker: Broker; url: string }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const regenerateMutation = useMutation({
    mutationFn: async () => (await api.post(`/admin/binary-signals/webhooks/${broker}/regenerate`)).data,
    onSuccess: () => {
      toast.success(`${BROKER_LABELS[broker]} webhook regenerated — update it in TradingView`);
      queryClient.invalidateQueries({ queryKey: ["admin-binary-webhooks"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to regenerate webhook"),
  });

  function copy() {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("Webhook URL copied");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function regenerate() {
    if (!window.confirm(`Regenerate the ${BROKER_LABELS[broker]} webhook? The current URL will stop working immediately.`)) return;
    regenerateMutation.mutate();
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-background p-4">
      <p className="text-sm font-semibold">{BROKER_LABELS[broker]}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg bg-muted/40 px-3 py-2 text-xs">{url}</code>
        <button
          type="button"
          aria-label="Copy webhook URL"
          onClick={copy}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <Button variant="outline" size="sm" onClick={regenerate} disabled={regenerateMutation.isPending} className="gap-1.5">
        <RefreshCw className="h-3.5 w-3.5" />
        {regenerateMutation.isPending ? "Regenerating..." : "Regenerate"}
      </Button>
    </div>
  );
}

export function AdminBinarySignalSettings() {
  const queryClient = useQueryClient();

  const durationsQuery = useQuery({
    queryKey: ["admin-binary-durations"],
    queryFn: async () => (await api.get<DurationsResponse>("/admin/binary-signals/durations")).data,
  });

  const webhooksQuery = useQuery({
    queryKey: ["admin-binary-webhooks"],
    queryFn: async () => (await api.get<WebhooksResponse>("/admin/binary-signals/webhooks")).data,
  });

  const setDurationMutation = useMutation({
    mutationFn: async ({ broker, seconds }: { broker: Broker; seconds: number }) =>
      (await api.put(`/admin/binary-signals/durations/${broker}`, { seconds })).data,
    onSuccess: () => {
      toast.success("Trade duration updated");
      queryClient.invalidateQueries({ queryKey: ["admin-binary-durations"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to update trade duration"),
  });

  const durations = durationsQuery.data?.durations;
  const allowedSeconds = durationsQuery.data?.allowedSeconds ?? [60, 180, 300, 900, 1800];
  const webhooks = webhooksQuery.data?.webhooks ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Trade Duration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Sets how long every binary trade stays open for that broker, regardless of what the TradingView alert sends.
          </p>
          {(["iq", "eo", "olymp"] as Broker[]).map((broker) => (
            <div key={broker} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-3">
              <span className="text-sm font-medium">{BROKER_LABELS[broker]}</span>
              <select
                className="h-9 rounded-lg border border-input bg-background/70 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={durations?.[broker] ?? ""}
                disabled={!durations || setDurationMutation.isPending}
                onChange={(event) => setDurationMutation.mutate({ broker, seconds: Number(event.target.value) })}
              >
                {allowedSeconds.map((seconds) => (
                  <option key={seconds} value={seconds}>
                    {DURATION_LABELS[seconds] ?? `${seconds}s`}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-Broker Webhooks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            One dedicated TradingView webhook per broker — sends to every subscriber of that broker (Pro and VIP). Existing
            shared webhooks keep working unchanged.
          </p>
          {webhooks.map((webhook) => (
            <WebhookRow key={webhook.broker} broker={webhook.broker} url={webhook.url} />
          ))}
          {!webhooksQuery.isLoading && webhooks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No webhooks yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
