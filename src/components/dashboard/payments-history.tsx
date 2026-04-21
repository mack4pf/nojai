"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payment } from "@/types";

interface PaymentsResponse {
  payments: Payment[];
  total: number;
  page: number;
  pages: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300",
  free: "bg-sky-500/15 text-sky-300",
  pending: "bg-amber-500/15 text-amber-300",
  expired: "bg-white/[0.08] text-muted-foreground",
  cancelled: "bg-red-500/15 text-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  free: "Free",
  pending: "Pending",
  expired: "Expired",
  cancelled: "Cancelled",
};

const PLAN_COLORS: Record<string, string> = {
  vip: "bg-amber-500/15 text-amber-300",
  pro: "bg-violet-500/15 text-violet-300",
  standard: "bg-blue-500/15 text-blue-300",
};

const METHOD_LABELS: Record<string, string> = {
  paystack: "Paystack",
  nowpayments: "Crypto",
  manual: "Manual / Code",
};

const TYPE_COLORS: Record<string, string> = {
  subscription: "bg-violet-500/15 text-violet-300",
  course: "bg-teal-500/15 text-teal-300",
};

export function PaymentsHistory() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<PaymentsResponse>({
    queryKey: ["user-payments", page],
    queryFn: async () => {
      const res = await api.get<PaymentsResponse>("/user/payments", {
        params: { page, limit: 20 },
      });
      return res.data;
    },
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
  });

  const payments = data?.payments ?? [];

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm">Failed to load payment history.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {data?.total ?? 0} transaction{(data?.total ?? 0) !== 1 ? "s" : ""}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2.5 text-xs"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Empty state */}
      {payments.length === 0 && (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <p className="text-sm font-medium text-foreground">No transactions yet</p>
          <p className="text-xs text-muted-foreground">Your subscription and course payments will appear here.</p>
        </div>
      )}

      {payments.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-white/[0.08] md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {payments.map((payment) => (
                  <tr key={payment._id} className="bg-white/[0.01] transition-colors hover:bg-white/[0.04]">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-foreground">{payment.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0 text-[10px] font-semibold capitalize ${TYPE_COLORS[payment.type] ?? ""}`}>
                            {payment.type}
                          </span>
                          {payment.plan && (
                            <span className={`inline-flex items-center rounded-md px-1.5 py-0 text-[10px] font-semibold capitalize ${PLAN_COLORS[payment.plan] ?? ""}`}>
                              {payment.plan}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">
                      {payment.amount > 0
                        ? formatCurrency(payment.amount, payment.currency)
                        : <span className="text-xs text-muted-foreground">Free</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[payment.status] ?? ""}`}>
                        {STATUS_LABELS[payment.status] ?? payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {payment.endDate ? formatDate(payment.endDate) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="space-y-3 md:hidden">
            {payments.map((payment) => (
              <div key={payment._id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">{payment.label}</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0 text-[10px] font-semibold capitalize ${TYPE_COLORS[payment.type] ?? ""}`}>
                        {payment.type}
                      </span>
                      {payment.plan && (
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0 text-[10px] font-semibold capitalize ${PLAN_COLORS[payment.plan] ?? ""}`}>
                          {payment.plan}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold shrink-0 ${STATUS_COLORS[payment.status] ?? ""}`}>
                    {STATUS_LABELS[payment.status] ?? payment.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium text-foreground text-right">
                    {payment.amount > 0 ? formatCurrency(payment.amount, payment.currency) : "Free"}
                  </span>
                  <span className="text-muted-foreground">Method</span>
                  <span className="text-right">{METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}</span>
                  <span className="text-muted-foreground">Date</span>
                  <span className="text-right">{formatDate(payment.createdAt)}</span>
                  {payment.endDate && (
                    <>
                      <span className="text-muted-foreground">Expires</span>
                      <span className="text-right">{formatDate(payment.endDate)}</span>
                    </>
                  )}
                </div>
                {payment.paymentReference && (
                  <p className="truncate rounded-lg bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-muted-foreground">
                    Ref: {payment.paymentReference}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {(data?.pages ?? 1) > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {data?.page ?? page} of {data?.pages ?? 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={page >= (data?.pages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
