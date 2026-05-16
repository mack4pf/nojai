"use client";

import { Copy, Server, Webhook } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetaTrader5Icon } from "@/components/icons/metatrader5-icon";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

interface Mt5Account {
  _id: string;
  brokerName: string;
  login: string;
  accountType: "demo" | "real";
  status: "pending" | "deploying" | "connected" | "disconnected" | "error";
  webhookToken: string;
}

const MT5_TEMPLATE = `{
  "ticker": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "orderType": "market",
  "tp": [0],
  "sl": 0
}`;

const FIELD_GUIDE = [
  {
    field: "ticker",
    values: "{{ticker}}",
    description: "Filled automatically by your signal platform with the asset symbol, e.g. EURUSD or XAUUSD.",
  },
  {
    field: "action",
    values: "{{strategy.order.action}}",
    description: 'Filled automatically with "buy", "sell", or "close" based on your strategy signal.',
  },
  {
    field: "orderType",
    values: '"market" | "limit" | "stop"',
    description: '"market" executes immediately at the current price. Change to "limit" or "stop" for pending orders.',
  },
  {
    field: "tp",
    values: "[0], [1.0900], [1.0900, 1.0950, 1.1000] \u2026",
    description: "Array of Take Profit prices. Use [0] to disable. Add multiple values for partial closes at each level, e.g. [1.0900, 1.0950, 1.1000].",
  },
  {
    field: "sl",
    values: "0, 1.0750, 1900.0 \u2026",
    description: "Stop Loss price. Set to 0 to disable. When price reaches this level, the trade closes automatically to limit a loss.",
  },
];

export function Mt5WebhookSection() {
  const { data: accounts = [], isLoading } = useQuery<Mt5Account[]>({
    queryKey: queryKeys.mt5Accounts,
    queryFn: async () => {
      const response = await api.get("/mt5/accounts");
      return (response.data?.accounts ?? []) as Mt5Account[];
    },
  });

  const connected = accounts.filter((a) => a.status !== "disconnected");

  function copyUrl(token: string) {
    const url = `${window.location.origin.replace(":3000", ":5000")}/api/mt5-webhook/${token}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Webhook URL copied"));
  }

  function copyTemplate() {
    navigator.clipboard.writeText(MT5_TEMPLATE).then(() => toast.success("Template copied"));
  }

  return (
    <div className="space-y-5">
      {/* Webhook URLs */}
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 mt5-outer-panel">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#59c7f9]/25 bg-[#59c7f9]/10">
            <MetaTrader5Icon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold">MT5 Webhook URLs</h2>
            <p className="text-xs text-muted-foreground">
              Send the JSON message below to this URL whenever your signal fires.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-muted-foreground mt5-account-card">
            Loading accounts...
          </div>
        ) : connected.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-white/10 p-5 mt5-account-card">
            <Server className="h-5 w-5 shrink-0 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">No MT5 accounts connected</p>
              <p className="mt-0.5 text-xs text-muted-foreground/60">
                Connect an MT5 account from the MT5 AutoTrade page to see your webhook URLs here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {connected.map((account) => {
              const url = `${typeof window !== "undefined" ? window.location.origin.replace(":3000", ":5000") : ""}/api/mt5-webhook/${account.webhookToken}`;
              return (
                <div key={account._id} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 mt5-account-card">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{account.brokerName}</span>
                    <Badge variant="outline" className="text-[10px]">{account.login}</Badge>
                    <Badge variant={account.accountType === "real" ? "success" : "secondary"} className="text-[10px]">
                      {account.accountType}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2 mt5-code-block">
                      <Webhook className="h-3.5 w-3.5 shrink-0 text-cyan-300/70" />
                      <code className="min-w-0 flex-1 overflow-x-auto break-all text-xs text-cyan-100 mt5-code-text">
                        {url}
                      </code>
                    </div>
                    <Button type="button" variant="secondary" size="sm" className="shrink-0 gap-1.5" onClick={() => copyUrl(account.webhookToken)}>
                      <Copy className="h-3.5 w-3.5" /> Copy URL
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* JSON message template */}
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-5 mt5-outer-panel">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Message Template</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Paste this into the message / body field of your alert. The{" "}
              <code className="text-primary">{"{{variables}}"}</code> are replaced automatically when the signal fires.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" className="shrink-0 gap-1.5" onClick={copyTemplate}>
            <Copy className="h-3.5 w-3.5" /> Copy
          </Button>
        </div>

        <pre className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-black/25 p-4 text-sm leading-relaxed text-emerald-300 mt5-pre-block whitespace-pre">
{MT5_TEMPLATE}
        </pre>

        {/* Field guide */}
        <div className="space-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 mt5-account-card">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            What each field means
          </p>
          {FIELD_GUIDE.map(({ field, values, description }) => (
            <div key={field} className="flex gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/15 text-[10px] font-bold text-primary">
                {field[0].toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold">
                  <code className="text-primary">{`"${field}"`}</code>
                  <span className="ml-2 font-normal text-muted-foreground">{values}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
