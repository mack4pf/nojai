"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, PlugZap, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

type IuxSettings = {
  enabled: boolean;
  paid: boolean;
  monthlyPriceUsd: number;
  hasAccess: boolean;
  accessStatus?: "free" | "active" | "expired" | "revoked" | "none" | "disabled";
  accessReason?: string;
  accessExpiresAt?: string;
  daysRemaining?: number;
};

type IuxAccount = {
  _id: string;
  accountName: string;
  environment: "sandbox" | "live";
  status: "connected" | "disconnected" | "error" | "pending" | "suspended";
  balance: number;
  equity?: number;
  currency: string;
  lastSyncAt?: string;
  lastError?: string;
};

const iuxKeys = {
  settings: ["iux", "settings"] as const,
  accounts: ["iux", "accounts"] as const,
};

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value?: string) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function accessLabel(settings?: IuxSettings) {
  if (!settings) return "Loading";
  if (!settings.enabled) return "Disabled";
  if (!settings.paid) return "Free";
  if (!settings.hasAccess) {
    if (settings.accessStatus === "revoked") return "Revoked";
    if (settings.accessStatus === "expired") return "Expired";
    return money(settings.monthlyPriceUsd);
  }
  if (typeof settings.daysRemaining === "number") {
    return settings.daysRemaining <= 0 ? "Expires today" : `${settings.daysRemaining} day${settings.daysRemaining === 1 ? "" : "s"} left`;
  }
  return "Active";
}

export function IuxAccountsManager() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ accountName: "", apiKey: "", apiSecret: "", environment: "live" as "live" | "sandbox" });

  const settingsQuery = useQuery({
    queryKey: iuxKeys.settings,
    queryFn: async () => (await api.get<IuxSettings>("/iux/settings")).data,
  });

  const accountsQuery = useQuery({
    queryKey: iuxKeys.accounts,
    queryFn: async () => (await api.get<{ accounts: IuxAccount[] }>("/iux/accounts")).data.accounts,
  });

  const connectMutation = useMutation({
    mutationFn: async () => api.post("/iux/accounts", form),
    onSuccess: () => {
      toast.success("IUX account saved");
      setForm({ accountName: "", apiKey: "", apiSecret: "", environment: "live" });
      queryClient.invalidateQueries({ queryKey: ["iux"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const refreshMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/iux/accounts/${id}/refresh`),
    onSuccess: () => {
      toast.success("IUX account refreshed");
      queryClient.invalidateQueries({ queryKey: iuxKeys.accounts });
    },
    onError: (error) => toast.error(error.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/iux/accounts/${id}`),
    onSuccess: () => {
      toast.success("IUX account disconnected");
      queryClient.invalidateQueries({ queryKey: iuxKeys.accounts });
    },
    onError: (error) => toast.error(error.message),
  });

  const settings = settingsQuery.data;
  const accounts = accountsQuery.data ?? [];
  const canConnect = Boolean(settings?.enabled && settings?.hasAccess);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="success">Partner broker</Badge>
          <h1 className="mt-3 font-display text-3xl font-bold text-foreground">IUX Broker</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Connect your IUX API credentials to prepare for broker automation and balance monitoring.
          </p>
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["iux"] })}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <ShieldCheck className="h-9 w-9 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">IUX status</p>
              <p className="text-xl font-bold">{settings?.enabled ? "Available" : "Disabled"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <PlugZap className="h-9 w-9 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Access</p>
              <p className="text-xl font-bold">{accessLabel(settings)}</p>
              {settings?.accessExpiresAt ? (
                <p className="text-xs text-muted-foreground">Until {formatDate(settings.accessExpiresAt)}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <CheckCircle2 className="h-9 w-9 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connected</p>
              <p className="text-xl font-bold">{accounts.filter((account) => account.status === "connected").length}/{accounts.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {!settingsQuery.isLoading && settings?.enabled && settings.paid && !settings.hasAccess ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-5 text-sm text-foreground">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="font-semibold">IUX access is currently paid.</p>
              <p className="mt-1 text-muted-foreground">
                {settings.accessReason ?? `Admin price is ${money(settings.monthlyPriceUsd)} per month.`} Ask support to activate IUX access on your account.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Connect IUX account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Account name"
              value={form.accountName}
              onChange={(event) => setForm((current) => ({ ...current, accountName: event.target.value }))}
              disabled={!canConnect}
            />
            <select
              className="h-11 rounded-2xl border border-input bg-background/70 px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.environment}
              onChange={(event) => setForm((current) => ({ ...current, environment: event.target.value as "live" | "sandbox" }))}
              disabled={!canConnect}
            >
              <option value="live">Live</option>
              <option value="sandbox">Sandbox</option>
            </select>
            <Input
              placeholder="IUX API key"
              value={form.apiKey}
              onChange={(event) => setForm((current) => ({ ...current, apiKey: event.target.value }))}
              disabled={!canConnect}
            />
            <Input
              type="password"
              placeholder="IUX API secret"
              value={form.apiSecret}
              onChange={(event) => setForm((current) => ({ ...current, apiSecret: event.target.value }))}
              disabled={!canConnect}
            />
          </div>
          <Button onClick={() => connectMutation.mutate()} disabled={!canConnect || connectMutation.isPending}>
            {connectMutation.isPending ? "Connecting..." : "Connect IUX account"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your IUX accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {accounts.map((account) => (
            <div key={account._id} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{account.accountName}</p>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{account.environment} - {account.status}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xl font-bold">{money(account.balance, account.currency)}</p>
                  <p className="text-xs text-muted-foreground">Last sync: {formatDate(account.lastSyncAt)}</p>
                </div>
              </div>
              {account.lastError ? <p className="mt-3 text-xs text-warning">{account.lastError}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => refreshMutation.mutate(account._id)} disabled={refreshMutation.isPending}>
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={() => disconnectMutation.mutate(account._id)} disabled={disconnectMutation.isPending}>
                  Disconnect
                </Button>
              </div>
            </div>
          ))}
          {!accountsQuery.isLoading && accounts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No IUX account connected yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
