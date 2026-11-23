"use client";

/**
 * Sending the "starting soon" email to everyone who reserved a seat.
 *
 * Email cannot be recalled, so this is built around not sending the wrong
 * thing: a test to one address first, a round name that makes a repeat press
 * harmless, and a confirmation that says how many people it will reach
 * before anything leaves.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface ReminderRound {
  id: string;
  label: string;
  status: "sending" | "completed" | "failed";
  recipientCount: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export function AdminWebinarReminders({ slug, registrationCount }: { slug: string; registrationCount: number }) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState(today());
  const [testEmail, setTestEmail] = useState("");
  const [confirming, setConfirming] = useState(false);

  const { data, isLoading } = useQuery<{ reminders: ReminderRound[] }>({
    queryKey: ["admin-webinar-reminders", slug],
    queryFn: async () => (await api.get<{ reminders: ReminderRound[] }>(`/admin/webinar/${slug}/reminders`)).data,
    // A round reports progress as it goes, so this refreshes while one runs.
    refetchInterval: (query) =>
      (query.state.data?.reminders ?? []).some((round) => round.status === "sending") ? 4000 : false,
  });
  const rounds = data?.reminders ?? [];

  const sendTest = useMutation({
    mutationFn: async () =>
      (await api.post(`/admin/webinar/${slug}/send-reminder`, { test: true, testEmail: testEmail.trim() })).data,
    onSuccess: (result: any) => toast.success(result?.message ?? "Test sent"),
    onError: (err: any) => toast.error(err?.response?.data?.message ?? err?.message ?? "Could not send the test"),
  });

  const sendAll = useMutation({
    mutationFn: async () =>
      (await api.post(`/admin/webinar/${slug}/send-reminder`, { label: label.trim() })).data,
    onSuccess: (result: any) => {
      toast.success(result?.message ?? "Reminder going out");
      setConfirming(false);
      queryClient.invalidateQueries({ queryKey: ["admin-webinar-reminders", slug] });
    },
    onError: (err: any) => {
      setConfirming(false);
      toast.error(err?.response?.data?.message ?? err?.message ?? "Could not send the reminder");
    },
  });

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="text-sm font-semibold">Send a reminder</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Goes to all {registrationCount.toLocaleString()} registrant{registrationCount === 1 ? "" : "s"} with the
          date, platform and join link. Name the round so a second press cannot email anyone twice — the same name
          is only ever delivered once per person.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Round name</Label>
            <Input className="mt-1" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="24h" />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Use something like <code>24h</code> or <code>starting-soon</code>. Defaults to today&apos;s date.
            </p>
          </div>
          <div>
            <Label className="text-xs">Send a test to yourself first</Label>
            <div className="mt-1 flex gap-2">
              <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@nojai.io" />
              <Button
                variant="outline"
                onClick={() => sendTest.mutate()}
                disabled={sendTest.isPending || !testEmail.trim()}
              >
                {sendTest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">A test reaches nobody else and can be repeated.</p>
          </div>
        </div>

        <Button
          className="mt-4"
          onClick={() => setConfirming(true)}
          disabled={sendAll.isPending || registrationCount === 0 || !label.trim()}
        >
          {sendAll.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
          Send to all {registrationCount.toLocaleString()}
        </Button>
        {registrationCount === 0 ? (
          <p className="mt-2 text-[11px] text-muted-foreground">Nobody has registered yet.</p>
        ) : null}
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="border-b px-5 py-3">
          <h3 className="text-sm font-semibold">Rounds sent</h3>
        </div>
        {isLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rounds.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">No reminder has been sent yet.</p>
        ) : (
          <div className="divide-y">
            {rounds.map((round) => (
              <div key={round.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{round.label}</p>
                    <Badge
                      variant={round.status === "completed" ? "success" : round.status === "failed" ? "destructive" : "warning"}
                      className="text-[10px]"
                    >
                      {round.status === "sending" ? "Sending" : round.status === "completed" ? "Sent" : "Failed"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatDate(round.startedAt, "MMM d, yyyy HH:mm")}
                    {round.error ? ` — ${round.error}` : ""}
                  </p>
                </div>
                <div className="flex gap-4 text-xs">
                  <span><span className="font-semibold text-emerald-500">{round.sentCount}</span> sent</span>
                  {round.skippedCount > 0 ? (
                    <span className="text-muted-foreground">{round.skippedCount} already had it</span>
                  ) : null}
                  {round.failedCount > 0 ? (
                    <span className="text-amber-500">{round.failedCount} failed</span>
                  ) : null}
                  <span className="text-muted-foreground">of {round.recipientCount}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Email ${registrationCount.toLocaleString()} registrants?`}
        description={`This sends the "${label.trim()}" reminder to everyone who reserved a seat. Email cannot be recalled. Anyone who already had this round will be skipped rather than emailed twice.`}
        confirmLabel="Send it"
        loading={sendAll.isPending}
        onConfirm={() => sendAll.mutate()}
      />
    </div>
  );
}
