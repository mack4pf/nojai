"use client";

import { useEffect, useRef, useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { Star, X } from "lucide-react";
import Link from "next/link";


import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface ReviewGrowthPopupProps {
  growthPercent: number;
}

const DISMISSED_KEY = "nojai_review_popup_dismissed";
const EMAIL_SENT_KEY = "nojai_review_email_sent";

export function ReviewGrowthPopup({ growthPercent }: ReviewGrowthPopupProps) {
  const [visible, setVisible] = useState(false);
  const emailMutationFired = useRef(false);

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      await api.post("/user/review-prompt-email", { growthPercent });
    },
    onSuccess: () => {
      localStorage.setItem(EMAIL_SENT_KEY, "1");
    },
    onError: () => {
      // Silent fail — popup is still shown
    },
  });

  useEffect(() => {
    // Only show if genuinely growing: ≥25% AND the growthPercent is a real positive number
    if (!growthPercent || growthPercent < 25) return;
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    setVisible(true);

    // Fire email once per browser session
    const emailSent = localStorage.getItem(EMAIL_SENT_KEY);
    if (!emailSent && !emailMutationFired.current) {
      emailMutationFired.current = true;
      sendEmailMutation.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [growthPercent]);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const pct = Math.round(growthPercent);

  return (
    <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm lg:bottom-8 lg:right-6 lg:left-auto lg:inset-x-auto">
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-[#0a0f16]/95 shadow-2xl backdrop-blur-2xl">
        {/* dismiss */}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {/* accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-400" />

        <div className="px-5 py-5">
          {/* stars */}
          <div className="mb-3 flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
            ))}
          </div>

          <p className="font-display text-base font-semibold text-foreground">
            Your account grew {pct}%! 🎉
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            That&apos;s impressive growth. Share your experience — your review helps other traders discover NOJAI.
          </p>

          <div className="mt-4 flex items-center gap-2">
            <Button asChild size="sm" className="flex-1">
              <Link href="/dashboard/review" onClick={dismiss}>
                Leave a Review
              </Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={dismiss}
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
