"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, Plus, RefreshCw, Star, Trash2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface AdminEOAccount {
  accountId: string;
  name: string;
  baseAmount: number;
  isDemo: boolean;
  isMain: boolean;
  isConnected: boolean;
  balance?: number;
  currency?: string;
  demoBalance?: number;
  realBalance?: number;
  lastConnected?: string | null;
}

interface AdminEOCopyTradeStatus {
  copyTradeEoEnabled: boolean;
  mainEoAccountId: string | null;
  isPolling: boolean;
  accounts: AdminEOAccount[];
}

const QUERY_KEY = ["admin-eo-copy-trade"];

export function AdminEoCopyTradeManager() {
  const queryClient = useQueryClient();

  const [showConnectForm, setShowConnectForm] = useState(false);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [baseAmount, setBaseAmount] = useState(1);
  const [isDemo, setIsDemo] = useState(true);

  const { data, isLoading, error } = useQuery<AdminEOCopyTradeStatus>({
    queryKey: QUERY_KEY,
    queryFn: async () => (await api.get("/admin/eo-copy-trade")).data,
    refetchInterval: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: (payload: { enabled?: boolean; mainEoAccountId?: string }) =>
      api.put("/admin/eo-copy-trade", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("EO copy-trade settings updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to update settings"),
  });

  const connectMutation = useMutation({
    mutationFn: () =>
      api.post("/admin/eo-copy-trade/connect", { token, baseAmount, isDemo }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(`${res.data?.account?.name ?? "EO account"} connected`);
      setToken("");
      setBaseAmount(1);
      setShowConnectForm(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to connect EO account"),
  });

  const disconnectMutation = useMutation({
    mutationFn: (accountId: string) =>
      api.delete("/admin/eo-copy-trade/disconnect", { data: { accountId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("EO account disconnected");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to disconnect"),
  });

  const reconnectMutation = useMutation({
    mutationFn: (accountId: string) =>
      api.post("/admin/eo-copy-trade/reconnect", { accountId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("EO account reconnected successfully");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to reconnect — try connecting manually"),
  });

  const enabled = data?.copyTradeEoEnabled ?? false;
  const mainId = data?.mainEoAccountId ?? null;
  const accounts = data?.accounts ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-400">
        Failed to load EO copy-trade status.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5">
          <Image src="/autobot-assets/experoptionlogo.png" alt="ExpertOption" width={28} height={28} className="h-7 w-7 object-contain" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">ExpertOption Copy Trading</h2>
          <p className="text-xs text-muted-foreground">
            Connect your admin EO accounts. Set one as the main source — users with copy enabled will mirror your trades.
          </p>
        </div>
      </div>

      {/* Enable/Disable toggle */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">EO Copy Trading Active</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              When enabled, your main EO account is polled for manual trades and they are dispatched to all opted-in PRO users.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${data?.isPolling ? "animate-pulse bg-emerald-400" : "bg-white/20"}`} />
              <span className="text-[11px] text-muted-foreground">
                {data?.isPolling ? "Polling active" : "Not polling"}
              </span>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => {
              if (checked && !mainId) {
                toast.error("Set a main EO account before enabling copy trading");
                return;
              }
              toggleMutation.mutate({ enabled: checked });
            }}
            disabled={toggleMutation.isPending}
          />
        </div>
      </div>

      {/* Accounts list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/70">
            Connected EO Accounts
            <span className="ml-1.5 text-white/30">({accounts.length})</span>
          </h3>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowConnectForm(!showConnectForm)}>
            <Plus className="h-3.5 w-3.5" /> Connect account
          </Button>
        </div>

        {accounts.length === 0 && !showConnectForm && (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
            <p className="text-sm text-muted-foreground">No EO accounts connected yet.</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Connect an account to start EO copy trading.</p>
            <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => setShowConnectForm(true)}>
              <Plus className="h-3.5 w-3.5" /> Connect account
            </Button>
          </div>
        )}

        {accounts.map((account) => {
          const balance = account.isDemo
            ? (account.demoBalance ?? account.balance)
            : (account.realBalance ?? account.balance);
          const isMain = String(account.accountId) === String(mainId);

          return (
            <div key={account.accountId} className={`rounded-2xl border p-5 transition-colors ${isMain ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-white/[0.06] bg-white/[0.02]"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
                    <Image src="/autobot-assets/experoptionlogo.png" alt="EO" width={24} height={24} className="h-6 w-6 object-contain" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{account.name || `Account #${account.accountId}`}</p>
                      {isMain && (
                        <Badge variant="success" className="gap-1 text-[10px]">
                          <Star className="h-2.5 w-2.5" /> Main
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <Badge variant={account.isDemo ? "outline" : "default"} className="text-[10px]">
                        {account.isDemo ? "Demo" : "Real"}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {account.isConnected
                          ? <Wifi className="h-3 w-3 text-emerald-400" />
                          : <WifiOff className="h-3 w-3 text-muted-foreground" />
                        }
                        <span className={`text-[10px] ${account.isConnected ? "text-emerald-400" : "text-muted-foreground"}`}>
                          {account.isConnected ? "Live" : "Offline"}
                        </span>
                      </div>
                      {balance != null && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatCurrency(balance, account.currency ?? "USD")}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">${account.baseAmount}/trade</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {!isMain && (
                    <Button
                      size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs"
                      title="Set as main account"
                      onClick={() => toggleMutation.mutate({ mainEoAccountId: String(account.accountId) })}
                      disabled={toggleMutation.isPending || !account.isConnected}
                    >
                      <Star className="h-3 w-3" /> Set main
                    </Button>
                  )}
                  {!account.isConnected && (
                    <Button
                      size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs"
                      title="Reconnect using stored token"
                      onClick={() => reconnectMutation.mutate(String(account.accountId))}
                      disabled={reconnectMutation.isPending}
                    >
                      <RefreshCw className={`h-3 w-3 ${reconnectMutation.isPending ? "animate-spin" : ""}`} />
                      {reconnectMutation.isPending ? "…" : "Reconnect"}
                    </Button>
                  )}
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                    title="Disconnect account"
                    onClick={() => { if (confirm(`Disconnect ${account.name || account.accountId}?`)) disconnectMutation.mutate(String(account.accountId)); }}
                    disabled={disconnectMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {isMain && (
                <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-[11px] text-emerald-300">
                  This is the main source account. Admin trades placed on this account will be mirrored to all users who have EO copy trading enabled.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Connect form */}
      {showConnectForm && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Connect Expert Option Account</h3>
          <p className="text-xs text-muted-foreground -mt-2">
            Paste your EO browser token. You can get this from the browser developer tools after logging into ExpertOption.
          </p>

          <div className="space-y-1.5">
            <Label>Browser Token</Label>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                placeholder="Paste your EO token here…"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Base Amount ($)</Label>
              <Input
                type="number"
                min={1}
                value={baseAmount}
                onChange={(e) => setBaseAmount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Account Mode</Label>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsDemo(true)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${isDemo ? "border-primary bg-primary/10 text-primary" : "border-white/[0.08] text-muted-foreground hover:border-white/20"}`}
                >
                  Demo
                </button>
                <button
                  type="button"
                  onClick={() => setIsDemo(false)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${!isDemo ? "border-primary bg-primary/10 text-primary" : "border-white/[0.08] text-muted-foreground hover:border-white/20"}`}
                >
                  Real
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => { setShowConnectForm(false); setToken(""); }}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => connectMutation.mutate()}
              disabled={!token.trim() || baseAmount < 1 || connectMutation.isPending}
            >
              {connectMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting…</> : "Connect"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
