"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Link2, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OlympConnectById } from "@/components/dashboard/olymp-connect-by-id";
import { api } from "@/lib/api";

/**
 * The first thing a user without an Olymp account sees.
 *
 * There are two routes in and they suit different people, so the choice is
 * made explicitly rather than by burying one path under the other: someone
 * who already trades on Olymp should not have to read a signup form to work
 * out it isn't for them.
 */

interface PartnerStatus {
  linked: boolean;
}

type Choice = null | "have" | "create";

export function OlympAccountSetup({ createForm }: { createForm: React.ReactNode }) {
  const [choice, setChoice] = useState<Choice>(null);

  const { data: status, isLoading } = useQuery<PartnerStatus>({
    queryKey: ["olymp-partner-status"],
    queryFn: async () => (await api.get("/olymp-partner/status")).data as PartnerStatus,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  // Already connected — the chooser has nothing left to ask, so the live
  // account card takes over entirely.
  if (status?.linked) return <>{createForm}</>;

  if (choice === "have") {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setChoice(null)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <OlympConnectById />
      </div>
    );
  }

  if (choice === "create") {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setChoice(null)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        {createForm}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
      <h3 className="font-display text-lg font-semibold tracking-tight">Set up Olymp Trade</h3>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground sm:text-sm">
        The bot trades your own Olymp account. Your money stays with Olymp — NOJAI never holds it.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setChoice("have")}
          className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
        >
          <Link2 className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm font-semibold">I already have an Olymp account</p>
          <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">
            Connect it with your Olymp account ID. No password needed.
          </p>
          <span className="mt-3 inline-block text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Connect it →
          </span>
        </button>

        <button
          type="button"
          onClick={() => setChoice("create")}
          className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
        >
          <Sparkles className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm font-semibold">Create one for me</p>
          <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">
            We&apos;ll open an Olymp account in your name. Takes a few seconds.
          </p>
          <span className="mt-3 inline-block text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Create it →
          </span>
        </button>
      </div>

      {/* Stated once, here, because it is the question both paths raise and
          neither answer is obvious from the buttons. */}
      <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
        Only accounts opened through NOJAI&apos;s Olymp link can be connected. If yours was opened
        elsewhere, choose <span className="text-foreground">Create one for me</span> instead.
      </p>

      <div className="mt-4 flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setChoice("have")}>
          Not sure? Try connecting first
        </Button>
      </div>
    </div>
  );
}
