"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Copy, ExternalLink, Eye, EyeOff, Info, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { OlympAccount, PlanTier, UserProfile } from "@/types";

interface OlympAccountsManagerProps {
  profile: UserProfile | null | undefined;
}

type AuthMethod = "token" | "password";

interface OlympFreeAccessInfo {
  approved: boolean;
  approvedAt?: string | null;
  settings: {
    affiliateLink: string;
    minDeposit: number;
    bonusCode: string;
  };
  submission?: {
    _id: string;
    olympEmail: string;
    olympAccountId: string;
    depositAmount?: number;
    status: "pending" | "approved" | "declined";
    adminNote?: string;
    createdAt: string;
    reviewedAt?: string;
  } | null;
}

export function OlympAccountsManager({ profile }: OlympAccountsManagerProps) {
  const queryClient = useQueryClient();
  const activePlan: PlanTier = profile?.subscription?.active ? profile.subscription.plan : (profile?.plan ?? "NONE");
  const profileOlympApproved = Boolean(profile?.olympTradeFreeAccess);

  const { data: olympFreeAccess } = useQuery<OlympFreeAccessInfo>({
    queryKey: queryKeys.olympFreeAccess,
    queryFn: async () => (await api.get("/user/olymp-free-access")).data as OlympFreeAccessInfo,
  });

  const hasOlympAccess = activePlan !== "NONE" || profileOlympApproved || Boolean(olympFreeAccess?.approved);
  const accountLimit = activePlan === "VIP" ? 2 : 1;

  const { data: accounts = [], isLoading } = useQuery<OlympAccount[]>({
    queryKey: queryKeys.olympAccounts,
    queryFn: async () => {
      const res = await api.get("/user/olymp-accounts");
      return (res.data.accounts ?? res.data ?? []) as OlympAccount[];
    },
    enabled: hasOlympAccess,
  });

  const [showConnectForm, setShowConnectForm] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>("token");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [baseAmount, setBaseAmount] = useState(10);
  const [accountGroup, setAccountGroup] = useState<"real" | "demo">("real");
  const [accountToDisconnect, setAccountToDisconnect] = useState<OlympAccount | null>(null);
  const [draftAmounts, setDraftAmounts] = useState<Record<number, number>>({});
  const [unlockEmail, setUnlockEmail] = useState(profile?.email ?? "");
  const [unlockAccountId, setUnlockAccountId] = useState("");
  const [unlockDepositAmount, setUnlockDepositAmount] = useState("");

  const canAddMore = hasOlympAccess && accounts.length < accountLimit;

  const submitUnlockMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        olympEmail: unlockEmail,
        olympAccountId: unlockAccountId,
        depositAmount: unlockDepositAmount ? Number(unlockDepositAmount) : undefined,
      };
      return (await api.post("/user/olymp-free-access/submit", payload)).data;
    },
    onSuccess: () => {
      toast.success("Olymp Trade details submitted for admin approval");
      setUnlockAccountId("");
      setUnlockDepositAmount("");
      queryClient.invalidateQueries({ queryKey: queryKeys.olympFreeAccess });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to submit Olymp Trade details"),
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const body =
        authMethod === "token"
          ? { authMethod, token, baseAmount, accountGroup }
          : { authMethod, email, password, verificationCode: verificationCode.trim() || undefined, baseAmount, accountGroup };
      return (await api.post("/user/olymp-account/connect", body)).data;
    },
    onSuccess: (data) => {
      if (data?.verificationRequired) {
        const message = data.message || "Olymp Trade needs an email or 2FA verification code before this account can connect.";
        setVerificationMessage(message);
        toast.warning(message);
        return;
      }
      toast.success("Olymp Trade account connected successfully");
      setToken("");
      setEmail("");
      setPassword("");
      setVerificationCode("");
      setVerificationMessage("");
      setBaseAmount(10);
      setAccountGroup("real");
      setShowConnectForm(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.olympAccounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      queryClient.invalidateQueries({ queryKey: queryKeys.olympFreeAccess });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to connect Olymp Trade account"),
  });

  const disconnectMutation = useMutation({
    mutationFn: async (accountId: number) => {
      await api.delete(`/user/olymp-account/${accountId}`);
    },
    onSuccess: () => {
      toast.success("Olymp Trade account disconnected");
      setAccountToDisconnect(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.olympAccounts });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to disconnect account"),
  });

  const refreshMutation = useMutation({
    mutationFn: async (accountId: number) => (await api.post(`/user/olymp-account/${accountId}/refresh-balance`)).data,
    onSuccess: () => {
      toast.success("Balance refresh requested");
      queryClient.invalidateQueries({ queryKey: queryKeys.olympAccounts });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to refresh balance"),
  });

  const baseAmountMutation = useMutation({
    mutationFn: async ({ accountId, nextBaseAmount }: { accountId: number; nextBaseAmount: number }) => {
      await api.patch(`/user/olymp-account/${accountId}/base-amount`, { baseAmount: nextBaseAmount });
    },
    onSuccess: () => {
      toast.success("Base amount updated");
      queryClient.invalidateQueries({ queryKey: queryKeys.olympAccounts });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update base amount"),
  });

  const connectDisabled =
    connectMutation.isPending ||
    baseAmount < 1 ||
    (authMethod === "token" ? token.trim().length < 10 : !email.trim() || !password.trim());

  const unlockSubmission = olympFreeAccess?.submission ?? null;
  const olympBonusCode = olympFreeAccess?.settings?.bonusCode || "NOJAI";
  const unlockDisabled =
    submitUnlockMutation.isPending ||
    !unlockEmail.trim() ||
    !unlockAccountId.trim();

  function copyBonusCode() {
    navigator.clipboard.writeText(olympBonusCode);
    toast.success("Olymp bonus code copied");
  }

  return (
    <div className="space-y-4">
      <div className="dashboard-solid-panel flex flex-col gap-2 rounded-2xl border border-emerald-500/25 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Olymp Trade</h2>
          <p className="text-[11px] text-muted-foreground">
            {hasOlympAccess ? `${accounts.length}/${accountLimit} accounts connected` : "Free forever after admin approval"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={hasOlympAccess ? "success" : "secondary"}>{hasOlympAccess ? (accounts.length > 0 ? "Active" : "Approved") : "Unlock free"}</Badge>
          {canAddMore && (
            <Button size="sm" variant="outline" onClick={() => setShowConnectForm((value) => !value)}>
              {showConnectForm ? "Cancel" : "+ Connect"}
            </Button>
          )}
        </div>
      </div>

      {!hasOlympAccess && (
        <div className="dashboard-solid-panel space-y-4 rounded-2xl border border-emerald-500/25 bg-white/[0.02] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Unlock Olymp Trade free tier</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Create your Olymp Trade account with the partner link, use bonus code {olympBonusCode}, deposit at least {formatCurrency(olympFreeAccess?.settings?.minDeposit ?? 10, "USD")}, then submit your Olymp email and ID.
              </p>
            </div>
            <Button asChild size="sm" className="gap-2">
              <a href={olympFreeAccess?.settings?.affiliateLink || "https://olymptrade.com/"} target="_blank" rel="noreferrer">
                Join Olymp <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/70">Olymp bonus code</p>
              <code className="mt-1 block font-mono text-lg font-bold tracking-widest text-foreground">{olympBonusCode}</code>
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={copyBonusCode}>
              <Copy className="h-4 w-4" /> Copy
            </Button>
          </div>

          {unlockSubmission && (
            <div className={`rounded-xl border p-3 text-xs ${
              unlockSubmission.status === "declined"
                ? "border-red-500/25 bg-red-500/[0.08] text-red-200"
                : "border-amber-500/25 bg-amber-500/[0.08] text-amber-100"
            }`}>
              <p className="font-semibold capitalize">Request status: {unlockSubmission.status}</p>
              {unlockSubmission.adminNote && <p className="mt-1">Admin note: {unlockSubmission.adminNote}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Olymp Trade Email</Label>
              <Input type="email" value={unlockEmail} onChange={(event) => setUnlockEmail(event.target.value)} placeholder="email@olymptrade.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Olymp Trade ID</Label>
              <Input value={unlockAccountId} onChange={(event) => setUnlockAccountId(event.target.value)} placeholder="Account ID" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Deposit Amount</Label>
              <Input type="number" min={0} value={unlockDepositAmount} onChange={(event) => setUnlockDepositAmount(event.target.value)} placeholder={`${olympFreeAccess?.settings?.minDeposit ?? 10}`} />
            </div>
          </div>

          <Button onClick={() => submitUnlockMutation.mutate()} disabled={unlockDisabled} className="w-full sm:w-auto">
            {submitUnlockMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit for approval"}
          </Button>
        </div>
      )}

      {hasOlympAccess && activePlan === "NONE" && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] p-3 text-xs text-emerald-100">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Your Olymp Trade free tier is active. You can connect one Olymp Trade account for free.</p>
        </div>
      )}

      {showConnectForm && (
        <div className="dashboard-solid-panel space-y-4 rounded-2xl border border-emerald-500/25 bg-white/[0.02] p-4">
          <div>
            <h3 className="text-sm font-semibold">Connect Olymp Trade Account</h3>
            <p className="mt-1 text-xs text-muted-foreground">Choose token for the most reliable connection, or try email/password login.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1">
            {(["token", "password"] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setAuthMethod(method)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  authMethod === method ? "bg-emerald-500 text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {method === "token" ? "Use token" : "Email/password"}
              </button>
            ))}
          </div>

          {authMethod === "password" && (
            <div className="flex gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] p-3 text-xs text-amber-200">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Olymp may ask for captcha or 2FA. If that happens, this form will tell you to use token login for now.</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {authMethod === "token" ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Access Token</Label>
                <div className="relative">
                  <Input
                    type={showSecret ? "text" : "password"}
                    value={token}
                    onChange={(event) => {
                      setToken(event.target.value);
                      setVerificationMessage("");
                    }}
                    placeholder="Paste Olymp access token"
                    className="pr-10"
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowSecret((value) => !value)}>
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setVerificationMessage("");
                    }}
                    placeholder="your@email.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Password</Label>
                  <div className="relative">
                    <Input
                      type={showSecret ? "text" : "password"}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setVerificationMessage("");
                      }}
                      placeholder="Olymp password"
                      className="pr-10"
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowSecret((value) => !value)}>
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Email / 2FA Code</Label>
                  <Input
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value)}
                    placeholder="Optional code from Olymp Trade"
                  />
                  {verificationMessage && <p className="text-xs text-amber-200">{verificationMessage}</p>}
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Base Trade Amount</Label>
              <Input type="number" min={1} value={baseAmount} onChange={(event) => setBaseAmount(Number(event.target.value))} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Account Group</Label>
              <select
                className="flex h-11 w-full rounded-2xl border border-input bg-background/70 px-4 text-sm text-foreground"
                value={accountGroup}
                onChange={(event) => setAccountGroup(event.target.value as "real" | "demo")}
              >
                <option value="real">Real</option>
                <option value="demo">Demo</option>
              </select>
            </div>
          </div>

          <Button className="w-full" onClick={() => connectMutation.mutate()} disabled={connectDisabled}>
            {connectMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</> : "Connect Olymp Trade"}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-white/[0.06] py-10">
          <p className="text-sm text-muted-foreground">Loading Olymp accounts...</p>
        </div>
      ) : accounts.length === 0 && !showConnectForm ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-10 text-center">
          <p className="text-sm text-muted-foreground">No Olymp Trade accounts connected</p>
          {activePlan !== "NONE" && (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowConnectForm(true)}>
              + Connect Account
            </Button>
          )}
        </div>
      ) : (
        accounts.map((account) => {
          const draftBaseAmount = draftAmounts[account.accountId] ?? account.baseAmount;
          return (
            <div key={account.accountId} className="dashboard-solid-panel space-y-3 rounded-2xl border border-emerald-500/25 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{account.name || account.email || `Olymp #${account.accountId}`}</p>
                  <p className="text-[11px] text-muted-foreground">ID: {account.accountId} · {account.accountGroup}</p>
                </div>
                <Badge variant={account.status === "connected" ? "success" : "warning"}>{account.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="dashboard-solid-panel rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Balance</p>
                  <p className="mt-1 font-display text-base font-semibold">{formatCurrency(account.balance ?? 0, account.currency ?? "USD")}</p>
                </div>
                <div className="dashboard-solid-panel rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Base Amount</p>
                  <p className="mt-1 text-sm font-semibold">{formatCurrency(account.baseAmount, account.currency ?? "USD")}</p>
                </div>
                <div className="dashboard-solid-panel rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Mode</p>
                  <p className="mt-1 text-sm font-semibold">{account.accountGroup === "real" ? "Real" : "Demo"}</p>
                </div>
                <div className="dashboard-solid-panel rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Last Connected</p>
                  <p className="mt-1 text-xs font-semibold">{account.lastConnected ? formatDate(account.lastConnected) : "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-white/5 pt-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-1.5">
                  <Label className="text-xs">Base Amount</Label>
                  <Input
                    type="number"
                    min={1}
                    value={draftBaseAmount}
                    onChange={(event) => setDraftAmounts((prev) => ({ ...prev, [account.accountId]: Number(event.target.value) }))}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => baseAmountMutation.mutate({ accountId: account.accountId, nextBaseAmount: draftBaseAmount })}
                    disabled={baseAmountMutation.isPending || draftBaseAmount < 1}
                  >
                    Save Amount
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-white/5 pt-3">
                <Button variant="outline" size="sm" onClick={() => refreshMutation.mutate(account.accountId)} disabled={refreshMutation.isPending}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh Balance
                </Button>
                <Button variant="danger" size="sm" onClick={() => setAccountToDisconnect(account)} disabled={disconnectMutation.isPending}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Disconnect
                </Button>
              </div>
            </div>
          );
        })
      )}

      <ConfirmDialog
        open={Boolean(accountToDisconnect)}
        onOpenChange={(open) => { if (!open) setAccountToDisconnect(null); }}
        title="Disconnect Olymp Trade account?"
        description={`Disconnect ${accountToDisconnect?.name || accountToDisconnect?.email || "this account"} from your bot.`}
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
