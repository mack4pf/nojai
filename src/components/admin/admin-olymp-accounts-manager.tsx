"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Info, Loader2, Plus, RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

const OLYMP_LOGO = "/autobot-assets/olymptrade.jpeg";
const QUERY_KEY = ["admin-olymp-accounts"];

type AuthMethod = "token" | "password";

interface AdminOlympAccount {
  accountId: number;
  email?: string;
  name?: string;
  accountGroup: "real" | "demo";
  baseAmount: number;
  balance: number;
  currency: string;
  status: "connected" | "disconnected";
  isConnected: boolean;
  lastConnected?: string | null;
}

interface AdminOlympAccountsResponse {
  accounts: AdminOlympAccount[];
  connectedCount: number;
}

export function AdminOlympAccountsManager() {
  const queryClient = useQueryClient();
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>("token");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [baseAmount, setBaseAmount] = useState(1);
  const [accountGroup, setAccountGroup] = useState<"real" | "demo">("real");
  const [draftAmounts, setDraftAmounts] = useState<Record<number, number>>({});
  const [accountToDisconnect, setAccountToDisconnect] = useState<AdminOlympAccount | null>(null);

  const { data, isLoading, error } = useQuery<AdminOlympAccountsResponse>({
    queryKey: QUERY_KEY,
    queryFn: async () => (await api.get("/admin/olymp-accounts")).data,
    refetchInterval: 30_000,
  });

  const accounts = data?.accounts ?? [];
  const connectedCount = data?.connectedCount ?? accounts.filter((account) => account.isConnected).length;

  const connectMutation = useMutation({
    mutationFn: async () => {
      const payload =
        authMethod === "token"
          ? { authMethod, token, baseAmount, accountGroup }
          : { authMethod, email, password, baseAmount, accountGroup };
      return (await api.post("/admin/olymp-accounts/connect", payload)).data;
    },
    onSuccess: (res) => {
      if (res?.verificationRequired) {
        toast.warning(res.message ?? "Olymp Trade needs captcha or 2FA verification. Use token login after completing it in the browser.");
        return;
      }
      toast.success(`${res?.account?.name ?? "Olymp Trade account"} connected`);
      setToken("");
      setEmail("");
      setPassword("");
      setBaseAmount(1);
      setAccountGroup("real");
      setShowConnectForm(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-connected-accounts"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to connect Olymp Trade account"),
  });

  const reconnectMutation = useMutation({
    mutationFn: (accountId: number) => api.post(`/admin/olymp-accounts/${accountId}/reconnect`),
    onSuccess: () => {
      toast.success("Olymp Trade account reconnected");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to reconnect Olymp Trade account"),
  });

  const refreshMutation = useMutation({
    mutationFn: (accountId: number) => api.post(`/admin/olymp-accounts/${accountId}/refresh-balance`),
    onSuccess: () => {
      toast.success("Balance refreshed");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to refresh balance"),
  });

  const baseAmountMutation = useMutation({
    mutationFn: ({ accountId, nextBaseAmount }: { accountId: number; nextBaseAmount: number }) =>
      api.patch(`/admin/olymp-accounts/${accountId}/base-amount`, { baseAmount: nextBaseAmount }),
    onSuccess: () => {
      toast.success("Base amount updated");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to update base amount"),
  });

  const disconnectMutation = useMutation({
    mutationFn: (accountId: number) => api.delete(`/admin/olymp-accounts/${accountId}`),
    onSuccess: () => {
      toast.success("Olymp Trade account disconnected");
      setAccountToDisconnect(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-connected-accounts"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to disconnect account"),
  });

  const connectDisabled =
    connectMutation.isPending ||
    baseAmount < 1 ||
    (authMethod === "token" ? token.trim().length < 10 : !email.trim() || !password.trim());

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
        Failed to load Olymp Trade accounts.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
          <Image src={OLYMP_LOGO} alt="Olymp Trade" width={32} height={32} className="h-8 w-8 object-contain" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Olymp Trade Admin Accounts</h2>
          <p className="text-xs text-muted-foreground">Connect Olymp Trade accounts for admin testing, monitoring, and Olymp signal execution.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Connected Olymp Accounts</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{connectedCount} live / {accounts.length} saved</p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowConnectForm((value) => !value)}>
            <Plus className="h-3.5 w-3.5" /> {showConnectForm ? "Cancel" : "Connect account"}
          </Button>
        </div>
      </div>

      {showConnectForm && (
        <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-white">Connect Olymp Trade Account</h3>

          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1">
            {(["token", "password"] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setAuthMethod(method)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${authMethod === method ? "bg-emerald-500 text-white" : "text-muted-foreground hover:text-foreground"}`}
              >
                {method === "token" ? "Use token" : "Email/password"}
              </button>
            ))}
          </div>

          {authMethod === "password" && (
            <div className="flex gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] p-3 text-xs text-amber-200">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Olymp may request captcha or 2FA. If that happens, login in the browser and connect with token.</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {authMethod === "token" ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Access Token</Label>
                <div className="relative">
                  <Input type={showSecret ? "text" : "password"} value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste Olymp access token" className="pr-10" />
                  <button type="button" onClick={() => setShowSecret((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@olymptrade.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input type={showSecret ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Olymp password" className="pr-10" />
                    <button type="button" onClick={() => setShowSecret((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label>Base Amount</Label>
              <Input type="number" min={1} value={baseAmount} onChange={(e) => setBaseAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Account Group</Label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {(["real", "demo"] as const).map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setAccountGroup(group)}
                    className={`rounded-lg border py-2 text-xs font-medium transition-colors ${accountGroup === group ? "border-emerald-400 bg-emerald-500/15 text-emerald-300" : "border-white/[0.08] text-muted-foreground hover:border-white/20"}`}
                  >
                    {group === "real" ? "Real" : "Demo"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button className="w-full" onClick={() => connectMutation.mutate()} disabled={connectDisabled}>
            {connectMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</> : "Connect Olymp Trade"}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {accounts.length === 0 && !showConnectForm ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
            <p className="text-sm text-muted-foreground">No Olymp Trade accounts connected yet.</p>
            <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => setShowConnectForm(true)}>
              <Plus className="h-3.5 w-3.5" /> Connect account
            </Button>
          </div>
        ) : (
          accounts.map((account) => {
            const draftBaseAmount = draftAmounts[account.accountId] ?? account.baseAmount;
            return (
              <div key={account.accountId} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
                      <Image src={OLYMP_LOGO} alt="Olymp" width={26} height={26} className="h-6 w-6 object-contain" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{account.name || account.email || `Olymp #${account.accountId}`}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant={account.accountGroup === "real" ? "success" : "outline"} className="text-[10px]">{account.accountGroup === "real" ? "Real" : "Demo"}</Badge>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          {account.isConnected ? <Wifi className="h-3 w-3 text-emerald-400" /> : <WifiOff className="h-3 w-3" />}
                          {account.isConnected ? "Live" : "Offline"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">ID {account.accountId}</span>
                      </div>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setAccountToDisconnect(account)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-white/[0.05] bg-black/10 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Balance</p>
                    <p className="mt-1 text-sm font-semibold">{formatCurrency(account.balance ?? 0, account.currency ?? "USD")}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-black/10 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Base</p>
                    <p className="mt-1 text-sm font-semibold">{formatCurrency(account.baseAmount, account.currency ?? "USD")}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-black/10 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Status</p>
                    <p className={account.isConnected ? "mt-1 text-sm font-semibold text-emerald-300" : "mt-1 text-sm font-semibold text-muted-foreground"}>{account.isConnected ? "Live" : "Offline"}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-black/10 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Last</p>
                    <p className="mt-1 text-xs font-semibold">{account.lastConnected ? formatDate(account.lastConnected) : "-"}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-[1fr_auto_auto_auto]">
                  <Input type="number" min={1} value={draftBaseAmount} onChange={(e) => setDraftAmounts((prev) => ({ ...prev, [account.accountId]: Number(e.target.value) }))} />
                  <Button variant="outline" onClick={() => baseAmountMutation.mutate({ accountId: account.accountId, nextBaseAmount: draftBaseAmount })} disabled={baseAmountMutation.isPending || draftBaseAmount < 1}>Save amount</Button>
                  <Button variant="outline" onClick={() => refreshMutation.mutate(account.accountId)} disabled={refreshMutation.isPending}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh</Button>
                  {!account.isConnected && (
                    <Button variant="outline" onClick={() => reconnectMutation.mutate(account.accountId)} disabled={reconnectMutation.isPending}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reconnect</Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmDialog
        open={Boolean(accountToDisconnect)}
        onOpenChange={(open) => { if (!open) setAccountToDisconnect(null); }}
        title="Disconnect Olymp Trade account?"
        description={`Disconnect ${accountToDisconnect?.name || accountToDisconnect?.email || "this account"} from admin Olymp accounts.`}
        confirmLabel="Disconnect"
        destructive
        loading={disconnectMutation.isPending}
        onConfirm={() => {
          if (accountToDisconnect) disconnectMutation.mutate(accountToDisconnect.accountId);
        }}
      />
    </div>
  );
}
