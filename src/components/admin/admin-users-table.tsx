"use client";

import { useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, ShieldOff, Trash2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatDate, normalizeArray } from "@/lib/utils";
import type { UserProfile } from "@/types";

const PLAN_STYLE: Record<string, string> = {
  VIP: "bg-amber-500 text-white",
  PRO: "bg-violet-500 text-white",
  STANDARD: "bg-sky-500 text-white",
  NONE: "bg-white/10 text-muted-foreground",
};

export function AdminUsersTable() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "subscribed" | "unsubscribed">("all");

  const { data: users = [] } = useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: async () => normalizeArray<UserProfile>((await api.get("/admin/users")).data),
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => {
      toast.success("User removed");
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const promoteMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "promote" | "demote" }) =>
      api.put(`/coconutadminlogin/${action}/${userId}`),
    onSuccess: (_, vars) => {
      toast.success(vars.action === "promote" ? "User promoted to admin" : "Admin demoted to user");
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const now = new Date();

  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => {
        const term = search.toLowerCase();
        return [user.name, user.email].some((f) => f?.toLowerCase().includes(term));
      })
      .filter((user) => {
        if (filter === "subscribed") {
          return user.plan !== "NONE" && user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt) > now : false;
        }
        if (filter === "unsubscribed") {
          return user.plan === "NONE" || !user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) <= now;
        }
        return true;
      });
  }, [search, filter, users, now]);

  const subscribedCount = users.filter(
    (u) => u.plan !== "NONE" && u.subscriptionExpiresAt && new Date(u.subscriptionExpiresAt) > now,
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Users ({users.length})</CardTitle>
          <div className="flex gap-2 text-xs">
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 font-semibold text-emerald-400">
              <UserCheck className="h-3 w-3" /> {subscribedCount} subscribed
            </span>
            <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 font-semibold text-muted-foreground">
              <UserX className="h-3 w-3" /> {users.length - subscribedCount} unsubscribed
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            className="flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
          />
          <div className="flex gap-2">
            {(["all", "subscribed", "unsubscribed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  filter === f
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {filteredUsers.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No users found.</p>
          )}
          {filteredUsers.map((user) => {
            const isSubscribed =
              user.plan !== "NONE" &&
              user.subscriptionExpiresAt &&
              new Date(user.subscriptionExpiresAt) > now;
            const isAdmin = user.role === "admin";

            return (
              <div
                key={user._id}
                className={`rounded-2xl border p-4 transition-colors ${
                  isSubscribed
                    ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{user.name}</p>
                      {/* Plan badge */}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PLAN_STYLE[user.plan] ?? PLAN_STYLE.NONE}`}>
                        {user.plan}
                      </span>
                      {/* Subscribed indicator */}
                      {isSubscribed ? (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          SUBSCRIBED
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          FREE
                        </span>
                      )}
                      {/* Admin badge */}
                      {isAdmin && (
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{user.email}</p>
                    {user.subscriptionExpiresAt && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {isSubscribed ? "Expires" : "Expired"}: {formatDate(user.subscriptionExpiresAt, "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* Promote / Demote */}
                    {isAdmin ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => promoteMutation.mutate({ userId: user._id, action: "demote" })}
                        disabled={promoteMutation.isPending}
                      >
                        <ShieldOff className="mr-1.5 h-3.5 w-3.5" /> Demote
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => promoteMutation.mutate({ userId: user._id, action: "promote" })}
                        disabled={promoteMutation.isPending}
                      >
                        <Shield className="mr-1.5 h-3.5 w-3.5" /> Make admin
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteMutation.mutate(user._id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}