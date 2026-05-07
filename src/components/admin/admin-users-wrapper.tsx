"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mail, Loader2, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { AdminUsersProfitSummary } from "@/components/admin/admin-users-profit";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type Tab = "users" | "profit";

export function AdminUsersWrapper() {
  const [tab, setTab] = useState<Tab>("users");

  const reviewEmailMutation = useMutation({
    mutationFn: async () => api.post("/admin/trigger-review-emails"),
    onSuccess: (res: { data: { sent?: number } }) => {
      const count = res.data?.sent ?? 0;
      toast.success(count > 0 ? `Review emails sent to ${count} user${count !== 1 ? "s" : ""}` : "No eligible users found (7-day criteria)");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to send review emails"),
  });

  return (
    <div className="space-y-4">
      {/* Header with tabs + action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          <button
            onClick={() => setTab("users")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
              tab === "users"
                ? "bg-white/[0.1] text-foreground shadow-sm ring-1 ring-white/[0.08]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Users
          </button>
          <button
            onClick={() => setTab("profit")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
              tab === "profit"
                ? "bg-white/[0.1] text-foreground shadow-sm ring-1 ring-white/[0.08]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Profit Summary
          </button>
        </div>

        {/* 7-day review email trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => reviewEmailMutation.mutate()}
          disabled={reviewEmailMutation.isPending}
          className="gap-2 text-xs"
        >
          {reviewEmailMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Mail className="h-3.5 w-3.5" />
          )}
          Send 7-day Review Emails
        </Button>
      </div>

      {tab === "users" ? <AdminUsersTable /> : <AdminUsersProfitSummary />}
    </div>
  );
}
