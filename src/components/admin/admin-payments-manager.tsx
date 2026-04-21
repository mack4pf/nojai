"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

type PaymentStatus = "all" | "active" | "free" | "pending" | "expired" | "cancelled";

interface PaymentUser {
  _id: string;
  email: string;
  fullName?: string;
}

interface Payment {
  _id: string;
  type: "subscription" | "course";
  label: string;
  userId: PaymentUser | null;
  plan: "standard" | "pro" | "vip" | null;
  status: "active" | "free" | "pending" | "expired" | "cancelled";
  amount: number;
  currency: "NGN" | "USD";
  paymentMethod: "paystack" | "nowpayments" | "manual";
  paymentReference?: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
}

interface PaymentsResponse {
  payments: Payment[];
  total: number;
  page: number;
  pages: number;
}

const STATUS_LABELS: Record<PaymentStatus, string> = {
  all: "All",
  active: "Received",
  free: "Free",
  pending: "Pending",
  expired: "Expired",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<Payment["status"], string> = {
  active: "bg-emerald-500/15 text-emerald-300",
  free: "bg-sky-500/15 text-sky-300",
  pending: "bg-amber-500/15 text-amber-300",
  expired: "bg-white/[0.08] text-muted-foreground",
  cancelled: "bg-red-500/15 text-red-300",
};

const PLAN_COLORS: Record<string, string> = {
  vip: "bg-amber-500/15 text-amber-300",
  pro: "bg-violet-500/15 text-violet-300",
  standard: "bg-blue-500/15 text-blue-300",
};

const TYPE_COLORS: Record<Payment["type"], string> = {
  subscription: "bg-violet-500/15 text-violet-300",
  course: "bg-teal-500/15 text-teal-300",
};

const METHOD_LABELS: Record<Payment["paymentMethod"], string> = {
  paystack: "Paystack",
  nowpayments: "Crypto",
  manual: "Manual",
};

export function AdminPaymentsManager() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-payments", page, statusFilter],
    queryFn: async () => {
      const res = await api.get<PaymentsResponse>("/admin/revenue", {
        params: {
          page,
          limit: 20,
          period: "all",
          status: statusFilter === "all" ? undefined : statusFilter,
        },
      });
      return res.data;
    },
    retry: 1,
  });

  const payments = data?.payments ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = normalizedSearch
    ? payments.filter(
        (p) =>
          p.userId?.email.toLowerCase().includes(normalizedSearch) ||
          p.userId?.fullName?.toLowerCase().includes(normalizedSearch) ||
          p.paymentReference?.toLowerCase().includes(normalizedSearch) ||
          p.label.toLowerCase().includes(normalizedSearch) ||
          (p.plan?.toLowerCase() ?? "").includes(normalizedSearch),
      )
    : payments;

  // Aggregate summary for stats bar
  const received = payments.filter((p) => p.status === "active");
  const pending = payments.filter((p) => p.status === "pending");
  const totalNGN = received.filter((p) => p.currency === "NGN").reduce((sum, p) => sum + p.amount, 0);
  const totalUSD = received.filter((p) => p.currency === "USD").reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Total payments</p>
          <p className="mt-2 font-display text-3xl font-bold">{total}</p>
        </div>
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Received (this page)</p>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-300">{received.length}</p>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-emerald-400/80">
            {totalNGN > 0 ? <span>{formatCurrency(totalNGN, "NGN")}</span> : null}
            {totalUSD > 0 ? <span>{formatCurrency(totalUSD, "USD")}</span> : null}
          </div>
        </div>
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400">Pending</p>
          <p className="mt-2 font-display text-3xl font-bold text-amber-300">{pending.length}</p>
        </div>
        <div className="flex items-center justify-end rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "free", "pending", "expired", "cancelled"] as PaymentStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
                statusFilter === s
                  ? "bg-white/[0.1] text-foreground"
                  : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="w-full max-w-xs">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, name, reference..."
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 p-5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Failed to load payments. Try refreshing.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {payments.length === 0 ? "No payment records found." : "No payments matched your search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Description</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Method</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Expires</th>
                  <th className="px-5 py-4">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filtered.map((payment) => (
                  <tr key={payment._id} className="transition-colors hover:bg-white/[0.02]">
                    {/* Date */}
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {formatDate(payment.createdAt, "MMM d, yyyy")}
                      <br />
                      <span className="text-[11px] opacity-60">{formatDate(payment.createdAt, "HH:mm")}</span>
                    </td>

                    {/* User */}
                    <td className="px-5 py-4">
                      {payment.userId ? (
                        <div>
                          <p className="font-medium text-foreground">{payment.userId.email}</p>
                          {payment.userId.fullName ? (
                            <p className="text-xs text-muted-foreground">{payment.userId.fullName}</p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-foreground">{payment.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${TYPE_COLORS[payment.type]}`}>
                            {payment.type}
                          </span>
                          {payment.plan && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${PLAN_COLORS[payment.plan] ?? ""}`}>
                              {payment.plan}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-4 font-semibold text-foreground">
                      {formatCurrency(payment.amount, payment.currency)}
                    </td>

                    {/* Method */}
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {METHOD_LABELS[payment.paymentMethod]}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${STATUS_COLORS[payment.status]}`}>
                        {payment.status === "active" ? "Received" : payment.status}
                      </span>
                    </td>

                    {/* Expires */}
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {payment.endDate ? formatDate(payment.endDate, "MMM d, yyyy") : "—"}
                    </td>

                    {/* Reference */}
                    <td className="px-5 py-4">
                      {payment.paymentReference ? (
                        <span className="rounded bg-white/[0.06] px-2 py-1 font-mono text-[11px] text-muted-foreground">
                          {payment.paymentReference.length > 18
                            ? `${payment.paymentReference.slice(0, 18)}…`
                            : payment.paymentReference}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1 || isFetching}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(pages, page + 1))}
            disabled={page === pages || isFetching}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
