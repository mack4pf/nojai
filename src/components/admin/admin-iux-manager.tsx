"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, CheckCircle2, DollarSign, ExternalLink, KeyRound, RefreshCw, ShieldCheck, WalletCards, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";

type IuxSettings = {
  enabled: boolean;
  paid: boolean;
  monthlyPriceUsd: number;
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
  user?: {
    email?: string;
    fullName?: string;
  };
  access?: null | {
    active: boolean;
    status: "free" | "active" | "expired" | "revoked" | "none" | "disabled";
    reason?: string;
    startsAt?: string;
    expiresAt?: string;
    daysRemaining?: number;
  };
};

type IuxAccessUser = {
  _id: string;
  email: string;
  fullName?: string;
  access: null | {
    _id: string;
    status: "free" | "active" | "expired" | "revoked" | "none" | "disabled";
    amountUsd: number;
    expiresAt: string;
    daysRemaining?: number;
    reason?: string;
  };
};

type IuxJoinSettings = {
  affiliateLink: string;
  supportEmail: string;
  accessDays: number;
};

type IuxJoinSubmission = {
  _id: string;
  iuxEmail: string;
  iuxAccountId: string;
  status: "pending" | "approved" | "declined";
  adminNote?: string;
  reviewedAt?: string;
  createdAt: string;
  userId?: { _id: string; email: string; fullName?: string };
};

const joinStatusClass: Record<IuxJoinSubmission["status"], string> = {
  pending: "bg-amber-500/15 text-amber-300",
  approved: "bg-emerald-500/15 text-emerald-300",
  declined: "bg-red-500/15 text-red-300",
};

const iuxKeys = {
  settings: ["admin", "iux", "settings"] as const,
  accounts: ["admin", "iux", "accounts"] as const,
  access: (search: string) => ["admin", "iux", "access", search] as const,
  joinSettings: ["admin", "iux", "join-settings"] as const,
  joinSubmissions: (status: string) => ["admin", "iux", "join-submissions", status] as const,
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

function statusVariant(status: IuxAccount["status"]) {
  if (status === "connected") return "success";
  if (status === "pending") return "warning";
  if (status === "error") return "warning";
  if (status === "suspended") return "warning";
  return "outline";
}

function accessVariant(access?: IuxAccount["access"] | IuxAccessUser["access"]) {
  if (!access) return "outline";
  if (access.status === "active" || access.status === "free") return "success";
  if (access.status === "expired" || access.status === "revoked" || access.status === "disabled") return "warning";
  return "outline";
}

function accessText(access?: IuxAccount["access"] | IuxAccessUser["access"]) {
  if (!access) return "No access";
  if (access.status === "free") return "Free";
  if (access.status === "active") {
    if (typeof access.daysRemaining === "number") {
      return access.daysRemaining <= 0 ? "Expires today" : `${access.daysRemaining} day${access.daysRemaining === 1 ? "" : "s"} left`;
    }
    return "Active";
  }
  return access.status.charAt(0).toUpperCase() + access.status.slice(1);
}

export function AdminIuxManager() {
  const queryClient = useQueryClient();
  const [settingsForm, setSettingsForm] = useState<IuxSettings>({ enabled: true, paid: true, monthlyPriceUsd: 10 });
  const [grantForm, setGrantForm] = useState({ email: "", days: 30, amountUsd: 10, note: "" });
  const [search, setSearch] = useState("");
  const [joinForm, setJoinForm] = useState<IuxJoinSettings>({ affiliateLink: "", supportEmail: "", accessDays: 30 });
  const [joinFilter, setJoinFilter] = useState<"all" | IuxJoinSubmission["status"]>("all");
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const settingsQuery = useQuery({
    queryKey: iuxKeys.settings,
    queryFn: async () => (await api.get<IuxSettings>("/admin/iux/settings")).data,
  });

  const accountsQuery = useQuery({
    queryKey: iuxKeys.accounts,
    queryFn: async () => (await api.get<{ accounts: IuxAccount[] }>("/admin/iux/accounts", { params: { limit: 50 } })).data.accounts,
  });

  const accessQuery = useQuery({
    queryKey: iuxKeys.access(search),
    queryFn: async () => (await api.get<{ users: IuxAccessUser[] }>("/admin/iux/access", { params: { search } })).data.users,
  });

  const joinSettingsQuery = useQuery({
    queryKey: iuxKeys.joinSettings,
    queryFn: async () => (await api.get<IuxJoinSettings>("/admin/iux/free-settings")).data,
  });

  const joinSubmissionsQuery = useQuery({
    queryKey: iuxKeys.joinSubmissions(joinFilter),
    queryFn: async () => {
      const params = joinFilter === "all" ? undefined : { status: joinFilter };
      const res = await api.get<{ submissions: IuxJoinSubmission[] }>("/admin/iux/submissions", { params });
      return res.data.submissions ?? [];
    },
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setSettingsForm(settingsQuery.data);
      setGrantForm((form) => ({ ...form, amountUsd: settingsQuery.data.monthlyPriceUsd || 10 }));
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    if (joinSettingsQuery.data) setJoinForm(joinSettingsQuery.data);
  }, [joinSettingsQuery.data]);

  const saveSettings = useMutation({
    mutationFn: async () => (await api.put<IuxSettings>("/admin/iux/settings", settingsForm)).data,
    onSuccess: (data) => {
      toast.success("IUX settings updated");
      queryClient.setQueryData(iuxKeys.settings, data);
    },
    onError: (error) => toast.error(error.message),
  });

  const grantAccess = useMutation({
    mutationFn: async () => api.post("/admin/iux/access/grant", grantForm),
    onSuccess: () => {
      toast.success("IUX access granted");
      setGrantForm((form) => ({ ...form, email: "", note: "" }));
      queryClient.invalidateQueries({ queryKey: ["admin", "iux"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const revokeAccess = useMutation({
    mutationFn: async (accessId: string) => api.post(`/admin/iux/access/${accessId}/revoke`),
    onSuccess: () => {
      toast.success("IUX access revoked");
      queryClient.invalidateQueries({ queryKey: ["admin", "iux"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const saveJoinSettings = useMutation({
    mutationFn: async () => (await api.put<IuxJoinSettings>("/admin/iux/free-settings", joinForm)).data,
    onSuccess: (data) => {
      toast.success("IUX join settings saved");
      queryClient.setQueryData(iuxKeys.joinSettings, data);
    },
    onError: (error: Error) => toast.error(error.message || "Failed to save IUX join settings"),
  });

  const approveJoin = useMutation({
    mutationFn: async (id: string) => (await api.post(`/admin/iux/submissions/${id}/approve`)).data,
    onSuccess: () => {
      toast.success("IUX access approved");
      queryClient.invalidateQueries({ queryKey: ["admin", "iux", "join-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "iux", "access"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to approve request"),
  });

  const declineJoin = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      (await api.post(`/admin/iux/submissions/${id}/decline`, { reason })).data,
    onSuccess: () => {
      toast.success("IUX join request declined");
      setDeclineId(null);
      setDeclineReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "iux", "join-submissions"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to decline request"),
  });

  const joinSubmissions = joinSubmissionsQuery.data ?? [];
  const joinPendingCount = joinSubmissions.filter((item) => item.status === "pending").length;

  const accounts = accountsQuery.data ?? [];
  const totals = useMemo(() => {
    const connected = accounts.filter((account) => account.status === "connected").length;
    const live = accounts.filter((account) => account.environment === "live").length;
    const balance = accounts.reduce((sum, account) => sum + (account.currency === "USD" ? account.balance : 0), 0);
    return { connected, live, balance };
  }, [accounts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">IUX Broker</p>
          <h1 className="font-display text-3xl font-bold text-foreground">IUX Access Control</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manage paid access, connection status, and the default monthly IUX plan price.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["admin", "iux"] });
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <ShieldCheck className="h-9 w-9 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Feature status</p>
              <p className="text-xl font-bold">{settingsForm.enabled ? "Enabled" : "Disabled"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <DollarSign className="h-9 w-9 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly price</p>
              <p className="text-xl font-bold">{settingsForm.paid ? money(settingsForm.monthlyPriceUsd) : "Free"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <WalletCards className="h-9 w-9 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connected accounts</p>
              <p className="text-xl font-bold">{totals.connected}/{accounts.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>IUX plan settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-4">
              <div>
                <p className="font-semibold">Enable IUX Broker</p>
                <p className="text-sm text-muted-foreground">Users can see and connect IUX accounts when enabled.</p>
              </div>
              <Switch
                checked={settingsForm.enabled}
                onCheckedChange={(enabled) => setSettingsForm((form) => ({ ...form, enabled }))}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-4">
              <div>
                <p className="font-semibold">Make IUX paid</p>
                <p className="text-sm text-muted-foreground">Turn off to make IUX free for every user.</p>
              </div>
              <Switch
                checked={settingsForm.paid}
                onCheckedChange={(paid) => setSettingsForm((form) => ({ ...form, paid, monthlyPriceUsd: paid ? form.monthlyPriceUsd || 10 : 0 }))}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly price in USD</p>
              <Input
                type="number"
                min={0}
                value={settingsForm.monthlyPriceUsd}
                onChange={(event) => setSettingsForm((form) => ({ ...form, monthlyPriceUsd: Number(event.target.value) }))}
                disabled={!settingsForm.paid}
              />
              <p className="text-xs text-muted-foreground">Default paid price is $10/month.</p>
            </div>
            <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
              {saveSettings.isPending ? "Saving..." : "Save IUX settings"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grant paid access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="user@email.com"
                value={grantForm.email}
                onChange={(event) => setGrantForm((form) => ({ ...form, email: event.target.value }))}
              />
              <Input
                type="number"
                min={1}
                placeholder="Days"
                value={grantForm.days}
                onChange={(event) => setGrantForm((form) => ({ ...form, days: Number(event.target.value) }))}
              />
              <Input
                type="number"
                min={0}
                placeholder="Amount USD"
                value={grantForm.amountUsd}
                onChange={(event) => setGrantForm((form) => ({ ...form, amountUsd: Number(event.target.value) }))}
              />
              <Input
                placeholder="Note, optional"
                value={grantForm.note}
                onChange={(event) => setGrantForm((form) => ({ ...form, note: event.target.value }))}
              />
            </div>
            <Button onClick={() => grantAccess.mutate()} disabled={grantAccess.isPending}>
              <KeyRound className="mr-2 h-4 w-4" />
              {grantAccess.isPending ? "Granting..." : "Grant IUX access"}
            </Button>

            <div className="border-t border-border pt-4">
              <Input
                placeholder="Search users by email or name"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="mt-4 max-h-[330px] space-y-3 overflow-auto pr-1">
                {(accessQuery.data ?? []).map((user) => (
                  <div key={user._id} className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">{user.fullName || "Unnamed user"}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {user.access ? `${accessText(user.access)} - ${formatDate(user.access.expiresAt)} - ${money(user.access.amountUsd)}` : "No IUX access"}
                      </p>
                      {user.access?.reason ? <p className="mt-1 text-xs text-warning">{user.access.reason}</p> : null}
                    </div>
                    {user.access?.status === "active" ? (
                      <Button variant="outline" size="sm" onClick={() => revokeAccess.mutate(user.access!._id)} disabled={revokeAccess.isPending}>
                        Revoke
                      </Button>
                    ) : (
                      <Badge variant={accessVariant(user.access)}>{accessText(user.access)}</Badge>
                    )}
                  </div>
                ))}
                {!accessQuery.isLoading && (accessQuery.data ?? []).length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No users found.</p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Join via affiliate link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_140px_1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">IUX Affiliate Link</Label>
              <Input value={joinForm.affiliateLink} onChange={(event) => setJoinForm((form) => ({ ...form, affiliateLink: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Free Access Days</Label>
              <Input
                type="number"
                min={1}
                value={joinForm.accessDays}
                onChange={(event) => setJoinForm((form) => ({ ...form, accessDays: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Support Email</Label>
              <Input type="email" value={joinForm.supportEmail} onChange={(event) => setJoinForm((form) => ({ ...form, supportEmail: event.target.value }))} />
            </div>
            <Button onClick={() => saveJoinSettings.mutate()} disabled={saveJoinSettings.isPending}>
              {saveJoinSettings.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
          {joinForm.affiliateLink ? (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={joinForm.affiliateLink} target="_blank" rel="noreferrer">
                Open current affiliate link <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : null}

          <div className="flex gap-2 overflow-x-auto border-t border-border pt-4">
            {(["all", "pending", "approved", "declined"] as const).map((item) => (
              <Button key={item} size="sm" variant={joinFilter === item ? "default" : "outline"} onClick={() => setJoinFilter(item)}>
                {item}
                {item === "pending" && joinPendingCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-[10px]">{joinPendingCount}</span>
                )}
              </Button>
            ))}
          </div>

          <div className="space-y-3">
            {joinSubmissions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                {joinFilter === "pending" ? "No pending IUX join requests." : "No IUX join requests found."}
              </p>
            ) : null}

            {joinSubmissions.map((submission) => {
              const userName = submission.userId?.fullName || submission.userId?.email || "Unknown user";
              const isDeclining = declineId === submission._id;
              return (
                <div key={submission._id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{userName}</p>
                      <p className="truncate text-xs text-muted-foreground">{submission.userId?.email || "No email"}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">Submitted {formatDate(submission.createdAt)}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-xs text-muted-foreground">IUX Email / ID</p>
                      <p className="truncate font-medium">{submission.iuxEmail} / {submission.iuxAccountId}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${joinStatusClass[submission.status]}`}>
                        {submission.status}
                      </span>
                      {submission.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => approveJoin.mutate(submission._id)} disabled={approveJoin.isPending} className="gap-1.5">
                            <CheckCircle className="h-4 w-4" /> Approve
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setDeclineId(submission._id)} className="gap-1.5">
                            <XCircle className="h-4 w-4" /> Decline
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {submission.adminNote ? (
                    <p className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-muted-foreground">
                      Admin note: {submission.adminNote}
                    </p>
                  ) : null}

                  {isDeclining ? (
                    <div className="mt-4 grid gap-3 border-t border-white/5 pt-4 sm:grid-cols-[1fr_auto]">
                      <Input value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} placeholder="Reason for declining this request" />
                      <Button
                        variant="danger"
                        disabled={declineJoin.isPending || declineReason.trim().length < 3}
                        onClick={() => declineJoin.mutate({ id: submission._id, reason: declineReason })}
                      >
                        Confirm Decline
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected IUX accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-muted/40 p-3">Live accounts: <span className="font-bold">{totals.live}</span></div>
            <div className="rounded-xl bg-muted/40 p-3">USD balance: <span className="font-bold">{money(totals.balance)}</span></div>
            <div className="rounded-xl bg-muted/40 p-3">Connected: <span className="font-bold">{totals.connected}</span></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4">User</th>
                  <th className="py-3 pr-4">Account</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Access</th>
                  <th className="py-3 pr-4">Balance</th>
                  <th className="py-3 pr-4">Last sync</th>
                  <th className="py-3 pr-4">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.map((account) => (
                  <tr key={account._id}>
                    <td className="py-3 pr-4">
                      <p className="font-semibold">{account.user?.fullName || "Unknown user"}</p>
                      <p className="text-xs text-muted-foreground">{account.user?.email || "No email"}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-semibold">{account.accountName}</p>
                      <p className="text-xs uppercase text-muted-foreground">{account.environment}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={statusVariant(account.status)}>
                        {account.status === "connected" ? <CheckCircle2 className="mr-1 h-3 w-3" /> : null}
                        {account.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={accessVariant(account.access)}>{accessText(account.access)}</Badge>
                      {account.access?.expiresAt ? (
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(account.access.expiresAt)}</p>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 font-semibold">{money(account.balance, account.currency)}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(account.lastSyncAt)}</td>
                    <td className="max-w-[240px] py-3 pr-4 text-xs text-muted-foreground">{account.lastError || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!accountsQuery.isLoading && accounts.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No IUX accounts connected yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
