"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface MyReview {
  _id: string;
  rating: number;
  comment: string;
  approved: boolean;
  createdAt: string;
}

export function ReviewSubmissionForm() {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");

  const { data: existing, isLoading } = useQuery<MyReview | null>({
    queryKey: ["my-review"],
    queryFn: async () => {
      const res = await api.get("/user/reviews/mine");
      return res.data ?? null;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      await api.post("/user/reviews", { rating, comment: comment.trim() });
    },
    onSuccess: () => {
      toast.success("Review submitted! It will appear once approved.");
      queryClient.invalidateQueries({ queryKey: ["my-review"] });
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to submit review"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Review</h1>
        <p className="mt-1 text-sm text-muted-foreground">Share your experience with NOJAI.</p>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : existing ? (
        /* Already submitted */
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Review submitted</p>
              <p className="text-xs text-muted-foreground">
                {existing.approved ? "Your review is live and visible to others." : "Awaiting admin approval before it goes public."}
              </p>
            </div>
            <span className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${existing.approved ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
              {existing.approved ? "Approved" : "Pending"}
            </span>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
            <div className="flex items-center gap-1 mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < existing.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
              ))}
              <span className="ml-2 text-xs text-muted-foreground">{existing.rating}/5</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{existing.comment}</p>
            <p className="mt-3 text-xs text-muted-foreground">{formatDate(existing.createdAt, "MMM d, yyyy")}</p>
          </div>
        </div>
      ) : (
        /* Submission form */
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-5">
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Your rating</p>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const value = i + 1;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(value)}
                    onMouseEnter={() => setHovered(value)}
                    onMouseLeave={() => setHovered(0)}
                    className="p-0.5 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        value <= (hovered || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                );
              })}
              {rating > 0 && (
                <span className="ml-2 text-sm font-medium text-amber-400">
                  {["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating]}
                </span>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Your comment</p>
            <Textarea
              placeholder="Tell others about your experience with NOJAI..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="mt-1 text-xs text-muted-foreground/60 text-right">{comment.length}/500</p>
          </div>

          <Button
            onClick={() => submitMutation.mutate()}
            disabled={rating === 0 || comment.trim().length < 10 || submitMutation.isPending}
            className="w-full sm:w-auto"
          >
            {submitMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
            ) : (
              "Submit review"
            )}
          </Button>

          {rating === 0 || comment.trim().length < 10 ? (
            <p className="text-xs text-muted-foreground/60">
              {rating === 0 ? "Select a star rating to continue." : "Add at least 10 characters to your comment."}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
