"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, RefreshCw, CheckCircle, XCircle, Banknote, Wallet,
  Clock, CircleDollarSign, AlertTriangle, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface AdminPayout {
  _id: string;
  userId: { _id: string; fullName?: string; email: string };
  amount: number;
  currency: string;
  method: "bank" | "wallet";
  status: "pending" | "approved" | "paid" | "rejected";
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  walletAddress?: string;
  walletNetwork?: string;
  walletCurrency?: string;
  note?: string;
  adminNote?: string;
  payoutReference?: string;
  createdAt: string;
  reviewedAt?: string;
  paidAt?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:  { label: "Awaiting Approval", className: "bg-amber-500/15 text-amber-300" },
  approved: { label: "Processing",        className: "bg-blue-500/15 text-blue-300" },
  paid:     { label: "Paid ✓",            className: "bg-emerald-500/15 text-emerald-300" },
  rejected: { label: "Rejected",          className: "bg-red-500/15 text-red-300" },
};

export function AdminAffiliates() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "paid" | "rejected">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null);
  const [confirmMarkPaidId, setConfirmMarkPaidId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleCopy = (text?: string, label?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label || "Text"} copied!`);
  };

  const { data: payouts = [], isLoading, refetch } = useQuery<AdminPayout[]>({
    queryKey: ["admin-payouts"],
    queryFn: async () => {
      const res = await api.get("/affiliate/admin/payouts");
      return res.data;
    },
  });

  const approvePayout = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/affiliate/admin/payouts/${id}/approve`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Payout approved and payment initiated!");
      queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Failed to approve payout");
    },
  });

  const rejectPayout = useMutation({
    mutationFn: async ({ id, adminNote }: { id: string; adminNote: string }) => {
      const res = await api.post(`/affiliate/admin/payouts/${id}/reject`, { adminNote });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Payout rejected");
      queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Failed to reject payout");
    },
  });

  const markPaidPayout = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/affiliate/admin/payouts/${id}/mark-paid`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Payout marked as paid manually");
      queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Failed to mark payout as paid");
    },
  });

  const filteredPayouts = payouts.filter(p => filter === "all" || p.status === filter);

  const pendingCount = payouts.filter(p => p.status === "pending").length;

  const handleApprove = (id: string) => {
    approvePayout.mutate(id, {
      onSettled: () => setConfirmApproveId(null),
    });
  };

  const handleMarkPaid = (id: string) => {
    markPaidPayout.mutate(id, {
      onSettled: () => setConfirmMarkPaidId(null),
    });
  };

  const handleReject = (id: string) => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    rejectPayout.mutate({ id, adminNote: rejectReason }, {
      onSettled: () => {
        setRejectId(null);
        setRejectReason("");
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Affiliate Payouts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage withdrawal requests. Approvals trigger instant transfers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
              <Clock className="h-3 w-3" /> {pendingCount} pending
            </span>
          )}
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 pb-1 overflow-x-auto">
        {(["all", "pending", "approved", "paid", "rejected"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="capitalize"
            size="sm"
          >
            {f}
            {f === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-[10px]">{pendingCount}</span>
            )}
          </Button>
        ))}
      </div>

      {/* Payout cards (mobile-first, table on desktop) */}
      <div className="space-y-3">
        {filteredPayouts.length === 0 && (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            <CircleDollarSign className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No payouts found.</p>
          </div>
        )}

        {filteredPayouts.map((payout) => {
          const userName = payout.userId?.fullName || payout.userId?.email || "Unknown";
          const userEmail = payout.userId?.email || "—";
          const statusCfg = STATUS_CONFIG[payout.status] ?? STATUS_CONFIG.pending;
          const isExpanded = expandedId === payout._id;

          return (
            <div
              key={payout._id}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden transition-all"
            >
              {/* Main row */}
              <div
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center cursor-pointer hover:bg-white/[0.03] transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : payout._id)}
              >
                {/* User info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>

                {/* Amount */}
                <div className="shrink-0 text-right sm:text-left sm:w-32">
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(payout.amount, payout.currency)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{payout.currency}</p>
                </div>

                {/* Method */}
                <div className="shrink-0 sm:w-24">
                  <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${
                    payout.method === "bank"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-violet-500/10 text-violet-400"
                  }`}>
                    {payout.method === "bank" ? <Banknote className="h-3 w-3" /> : <Wallet className="h-3 w-3" />}
                    {payout.method === "bank" ? "Bank" : "Crypto"}
                  </span>
                </div>

                {/* Status */}
                <div className="shrink-0 sm:w-36">
                  <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${statusCfg.className}`}>
                    {statusCfg.label}
                  </span>
                </div>

                {/* Date */}
                <p className="shrink-0 text-xs text-muted-foreground sm:w-24">{formatDate(payout.createdAt)}</p>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {payout.status === "pending" && (
                    <>
                      {confirmApproveId === payout._id ? (
                        <div className="flex items-center gap-2 animate-fade-in">
                          <span className="text-xs text-muted-foreground mr-1">Confirm transfer?</span>
                          <Button
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleApprove(payout._id); }}
                            disabled={approvePayout.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8"
                          >
                            {approvePayout.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes, Pay"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={(e) => { e.stopPropagation(); setConfirmApproveId(null); }}
                            disabled={approvePayout.isPending}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : rejectId === payout._id ? (
                        <div className="flex items-center gap-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason..."
                            className="h-8 w-32 rounded-md border border-white/10 bg-white/[0.04] px-2 text-xs text-foreground focus:border-primary focus:outline-none"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleReject(payout._id)}
                            disabled={rejectPayout.isPending}
                            className="h-8"
                          >
                            {rejectPayout.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => { setRejectId(null); setRejectReason(""); }}
                            disabled={rejectPayout.isPending}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : confirmMarkPaidId === payout._id ? (
                        <div className="flex items-center gap-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                          <span className="text-xs text-muted-foreground mr-1">Paid manually?</span>
                          <Button
                            size="sm"
                            onClick={() => handleMarkPaid(payout._id)}
                            disabled={markPaidPayout.isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-8"
                          >
                            {markPaidPayout.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => setConfirmMarkPaidId(null)}
                            disabled={markPaidPayout.isPending}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setConfirmApproveId(payout._id); setRejectId(null); setConfirmMarkPaidId(null); }}
                            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 gap-1.5 px-2"
                          >
                            <CheckCircle className="h-3 w-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setConfirmMarkPaidId(payout._id); setConfirmApproveId(null); setRejectId(null); }}
                            className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 gap-1.5 px-2"
                          >
                            <Banknote className="h-3 w-3" /> Pay Manually
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); setRejectId(payout._id); setConfirmApproveId(null); setConfirmMarkPaidId(null); setRejectReason(""); }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 gap-1.5 px-2"
                          >
                            <XCircle className="h-3 w-3" /> Reject
                          </Button>
                        </>
                      )}

                    </>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-white/[0.06] bg-white/[0.015] px-5 py-4 space-y-3 animate-fade-up">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Withdrawal Details */}
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                        {payout.method === "bank" ? "Bank Details" : "Wallet Details"}
                      </p>
                      {payout.method === "bank" ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg border border-white/5">
                            <span className="text-muted-foreground text-xs">Bank</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{payout.bankName || "—"}</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleCopy(payout.bankName, "Bank name")}>
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg border border-white/5">
                            <span className="text-muted-foreground text-xs">Account No.</span>
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-foreground">{payout.accountNumber || "—"}</code>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleCopy(payout.accountNumber, "Account number")}>
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg border border-white/5">
                            <span className="text-muted-foreground text-xs">Account Name</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{payout.accountName || "—"}</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleCopy(payout.accountName, "Account name")}>
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg border border-white/5">
                            <span className="text-muted-foreground text-xs">Network</span>
                            <span className="font-medium text-foreground">{payout.walletNetwork || "—"}</span>
                          </div>
                          <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-muted-foreground text-xs">Address</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleCopy(payout.walletAddress, "Wallet address")}>
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                            <code className="block break-all text-xs font-mono text-foreground">
                              {payout.walletAddress || "—"}
                            </code>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">User Info</p>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Name</span>
                          <span className="font-medium text-foreground">{payout.userId?.fullName || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Email</span>
                          <span className="font-medium text-foreground truncate max-w-[180px]">{payout.userId?.email || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">User ID</span>
                          <code className="text-xs text-muted-foreground">{payout.userId?._id || "—"}</code>
                        </div>
                      </div>
                    </div>

                    {/* Timeline / Notes */}
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Details</p>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Requested</span>
                          <span className="text-foreground">{formatDate(payout.createdAt)}</span>
                        </div>
                        {payout.reviewedAt && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Reviewed</span>
                            <span className="text-foreground">{formatDate(payout.reviewedAt)}</span>
                          </div>
                        )}
                        {payout.paidAt && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Paid</span>
                            <span className="text-foreground">{formatDate(payout.paidAt)}</span>
                          </div>
                        )}
                        {payout.payoutReference && (
                          <div>
                            <span className="text-muted-foreground text-xs">Reference</span>
                            <code className="block mt-1 break-all rounded-lg bg-black/40 px-2 py-1 text-[10px] font-mono text-muted-foreground">
                              {payout.payoutReference}
                            </code>
                          </div>
                        )}
                        {payout.note && (
                          <div>
                            <span className="text-muted-foreground text-xs">User Note</span>
                            <p className="mt-0.5 text-xs text-foreground/80">{payout.note}</p>
                          </div>
                        )}
                        {payout.adminNote && (
                          <div>
                            <span className="text-muted-foreground text-xs">Admin Note</span>
                            <p className="mt-0.5 text-xs text-red-300">{payout.adminNote}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
