"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatDate, normalizeArray } from "@/lib/utils";
import type { Review } from "@/types";

export function AdminReviewsManager() {
  const queryClient = useQueryClient();
  const [pendingApprove, setPendingApprove] = useState<string | null>(null);
  const [pendingReject, setPendingReject] = useState<string | null>(null);

  const { data: reviews = [] } = useQuery({
    queryKey: queryKeys.adminReviews,
    queryFn: async () => normalizeArray<Review>((await api.get("/admin/reviews")).data),
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      setPendingApprove(id);
      return api.put(`/admin/reviews/${id}/approve`);
    },
    onSuccess: () => {
      toast.success("Review approved");
      queryClient.invalidateQueries({ queryKey: queryKeys.adminReviews });
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setPendingApprove(null),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      setPendingReject(id);
      return api.delete(`/admin/reviews/${id}`);
    },
    onSuccess: () => {
      toast.success("Review rejected");
      queryClient.invalidateQueries({ queryKey: queryKeys.adminReviews });
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setPendingReject(null),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reviews moderation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {reviews.map((review) => (
          <div key={review._id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-foreground">{review.user?.name ?? "Anonymous"} · {review.rating}/5</p>
                <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatDate(review.createdAt, "MMM d, yyyy HH:mm")}</p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => approveMutation.mutate(review._id)}
                  disabled={pendingApprove === review._id || pendingReject === review._id}
                >
                  {pendingApprove === review._id ? "Approving..." : "Approve"}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => rejectMutation.mutate(review._id)}
                  disabled={pendingReject === review._id || pendingApprove === review._id}
                >
                  {pendingReject === review._id ? "Rejecting..." : "Reject"}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}