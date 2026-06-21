"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, ExternalLink, Loader2, RefreshCw, Save, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface OlympFreeSettings {
  affiliateLink: string;
  minDeposit: number;
  bonusCode: string;
  supportEmail: string;
}

interface OlympSubmission {
  _id: string;
  olympEmail: string;
  olympAccountId: string;
  depositAmount?: number;
  status: "pending" | "approved" | "declined";
  adminNote?: string;
  reviewedAt?: string;
  createdAt: string;
  userId?: {
    _id: string;
    email: string;
    fullName?: string;
    olympTradeFreeAccess?: boolean;
  };
}

const statusClass: Record<OlympSubmission["status"], string> = {
  pending: "bg-amber-500/15 text-amber-300",
  approved: "bg-emerald-500/15 text-emerald-300",
  declined: "bg-red-500/15 text-red-300",
};

export function AdminOlympFree() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | OlympSubmission["status"]>("all");
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [form, setForm] = useState<OlympFreeSettings>({
    affiliateLink: "",
    minDeposit: 10,
    bonusCode: "NOJAI",
    supportEmail: "",
  });

  const { data: settings, isLoading: settingsLoading } = useQuery<OlympFreeSettings>({
    queryKey: ["admin-olymp-free-settings"],
    queryFn: async () => (await api.get("/admin/olymp-free/settings")).data as OlympFreeSettings,
  });

  const { data: submissions = [], isLoading: submissionsLoading, refetch } = useQuery<OlympSubmission[]>({
    queryKey: ["admin-olymp-free-submissions"],
    queryFn: async () => {
      const res = await api.get("/admin/olymp-free/submissions");
      return (res.data.submissions ?? []) as OlympSubmission[];
    },
  });

  useEffect(() => {
    if (!settings) return;
    setForm(settings);
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: async () => (await api.put("/admin/olymp-free/settings", form)).data,
    onSuccess: () => {
      toast.success("Olymp Trade settings saved");
      queryClient.invalidateQueries({ queryKey: ["admin-olymp-free-settings"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save Olymp Trade settings"),
  });

  const approveRequest = useMutation({
    mutationFn: async (id: string) => (await api.post(`/admin/olymp-free/submissions/${id}/approve`)).data,
    onSuccess: () => {
      toast.success("Olymp Trade free access approved");
      queryClient.invalidateQueries({ queryKey: ["admin-olymp-free-submissions"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to approve request"),
  });

  const declineRequest = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => (
      await api.post(`/admin/olymp-free/submissions/${id}/decline`, { reason })
    ).data,
    onSuccess: () => {
      toast.success("Olymp Trade request declined");
      setDeclineId(null);
      setDeclineReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-olymp-free-submissions"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to decline request"),
  });

  const filteredSubmissions = useMemo(
    () => submissions.filter((item) => filter === "all" || item.status === filter),
    [filter, submissions],
  );

  const pendingCount = submissions.filter((item) => item.status === "pending").length;
  const loading = settingsLoading || submissionsLoading;

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Olymp Trade Free Tier</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review Olymp Trade partner submissions and manage free access settings.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_160px_160px_240px_auto] lg:items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">Olymp Trade Affiliate Link</Label>
            <Input value={form.affiliateLink} onChange={(event) => setForm((prev) => ({ ...prev, affiliateLink: event.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Minimum Deposit</Label>
            <Input type="number" min={0} value={form.minDeposit} onChange={(event) => setForm((prev) => ({ ...prev, minDeposit: Number(event.target.value) }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bonus Code</Label>
            <Input value={form.bonusCode} onChange={(event) => setForm((prev) => ({ ...prev, bonusCode: event.target.value.toUpperCase() }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Support Email</Label>
            <Input type="email" value={form.supportEmail} onChange={(event) => setForm((prev) => ({ ...prev, supportEmail: event.target.value }))} />
          </div>
          <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending} className="gap-2">
            {saveSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all", "pending", "approved", "declined"] as const).map((item) => (
          <Button key={item} size="sm" variant={filter === item ? "default" : "outline"} onClick={() => setFilter(item)}>
            {item}
            {item === "pending" && pendingCount > 0 && <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-[10px]">{pendingCount}</span>}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredSubmissions.length === 0 && (
          <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-muted-foreground">
            No Olymp Trade submissions found.
          </div>
        )}

        {filteredSubmissions.map((submission) => {
          const userName = submission.userId?.fullName || submission.userId?.email || "Unknown user";
          const isDeclining = declineId === submission._id;
          return (
            <div key={submission._id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{userName}</p>
                  <p className="truncate text-xs text-muted-foreground">{submission.userId?.email || "No email"}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Submitted {formatDate(submission.createdAt)}</p>
                </div>
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Olymp Email</p>
                  <p className="truncate font-medium">{submission.olympEmail}</p>
                </div>
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Olymp ID / Deposit</p>
                  <p className="font-medium">{submission.olympAccountId} / {submission.depositAmount ?? "-"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${statusClass[submission.status]}`}>
                    {submission.status}
                  </span>
                  {submission.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => approveRequest.mutate(submission._id)} disabled={approveRequest.isPending} className="gap-1.5">
                        <CheckCircle className="h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeclineId(submission._id)} className="gap-1.5">
                        <XCircle className="h-4 w-4" /> Decline
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {submission.adminNote && (
                <p className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-muted-foreground">
                  Admin note: {submission.adminNote}
                </p>
              )}

              {isDeclining && (
                <div className="mt-4 grid gap-3 border-t border-white/5 pt-4 sm:grid-cols-[1fr_auto]">
                  <Input value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} placeholder="Reason for declining this request" />
                  <Button
                    variant="danger"
                    disabled={declineRequest.isPending || declineReason.trim().length < 3}
                    onClick={() => declineRequest.mutate({ id: submission._id, reason: declineReason })}
                  >
                    Confirm Decline
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {form.affiliateLink && (
        <Button asChild variant="outline" className="gap-2">
          <a href={form.affiliateLink} target="_blank" rel="noreferrer">
            Open current affiliate link <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      )}
    </div>
  );
}
