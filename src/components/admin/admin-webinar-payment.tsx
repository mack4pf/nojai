"use client";

/**
 * The paid offer at webinar.nojai.io/payment, and who has bought it.
 *
 * Off until it is switched on here, because a live checkout takes real money
 * from real people. The switch sits next to the price and the course it
 * grants, so turning it on means having looked at both.
 */

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

interface WebinarPayment {
  enabled: boolean;
  amount: number;
  currency: "NGN" | "USD";
  courseId?: string;
  headline: string;
  subheadline: string;
  bullets: string[];
  ctaText: string;
  successMessage: string;
}

interface Purchase {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed";
  reference: string;
  accountCreated: boolean;
  courseGranted: boolean;
  failureReason?: string;
  paidAt?: string;
  createdAt: string;
}

interface CourseOption {
  _id: string;
  title: string;
}

const toList = (text: string) => text.split("\n").map((line) => line.trim()).filter(Boolean);

export function AdminWebinarPayment({
  slug,
  payment,
  siteUrl,
}: {
  slug: string;
  payment: WebinarPayment | undefined;
  siteUrl: string;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<WebinarPayment>(() => ({
    enabled: payment?.enabled ?? false,
    amount: payment?.amount ?? 60000,
    currency: payment?.currency ?? "NGN",
    courseId: payment?.courseId ?? "",
    headline: payment?.headline ?? "Get the full course",
    subheadline: payment?.subheadline ?? "",
    bullets: payment?.bullets ?? [],
    ctaText: payment?.ctaText ?? "Pay and get access",
    successMessage: payment?.successMessage ?? "Payment received. Check your email for your login details.",
  }));

  // The saved values win when the page refetches, so a save elsewhere is not
  // silently overwritten by a stale form.
  useEffect(() => {
    if (payment) setForm((prev) => ({ ...prev, ...payment, courseId: payment.courseId ?? "" }));
  }, [payment]);

  const { data: courseData } = useQuery<{ courses: CourseOption[] }>({
    queryKey: ["admin-courses-for-webinar"],
    queryFn: async () => (await api.get<{ courses: CourseOption[] }>("/admin/courses", { params: { limit: 100 } })).data,
    staleTime: 5 * 60_000,
  });
  const courses = courseData?.courses ?? [];

  const { data: purchaseData, isLoading: purchasesLoading } = useQuery<{
    purchases: Purchase[];
    total: number;
    paidCount: number;
    paidAmount: number;
  }>({
    queryKey: ["admin-webinar-purchases", slug],
    queryFn: async () => (await api.get(`/admin/webinar/${slug}/purchases`)).data,
  });
  const purchases = purchaseData?.purchases ?? [];

  const save = useMutation({
    mutationFn: async (next: WebinarPayment) =>
      (await api.put(`/admin/webinar/${slug}`, {
        payment: {
          enabled: next.enabled,
          amount: Number(next.amount),
          currency: next.currency,
          courseId: next.courseId ?? "",
          headline: next.headline,
          subheadline: next.subheadline,
          bullets: next.bullets,
          ctaText: next.ctaText,
          successMessage: next.successMessage,
        },
      })).data,
    onSuccess: () => {
      toast.success("Payment settings saved");
      queryClient.invalidateQueries({ queryKey: ["admin-webinar", slug] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? err?.message ?? "Could not save"),
  });

  const noCourse = !form.courseId;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Course payment</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Live at <code>{siteUrl}/payment</code>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <a href={`${siteUrl}/payment`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open
              </a>
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{form.enabled ? "On" : "Off"}</span>
              <Switch
                checked={form.enabled}
                onCheckedChange={(enabled) => setForm((prev) => ({ ...prev, enabled }))}
                aria-label="Enable webinar payments"
              />
            </div>
          </div>
        </div>

        {form.enabled ? (
          <p className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs">
            Payments are <strong>on</strong>. Anyone with the link can be charged{" "}
            {formatCurrency(Number(form.amount) || 0, form.currency)} through Flutterwave.
          </p>
        ) : (
          <p className="mt-3 rounded-xl border px-4 py-3 text-xs text-muted-foreground">
            Payments are <strong>off</strong>. The page tells visitors it is not open yet, and nobody can be charged.
          </p>
        )}

        {form.enabled && noCourse ? (
          <p className="mt-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs">
            No course is selected, so a payment would take the money and unlock nothing. Pick one below.
          </p>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Price</Label>
            <Input
              className="mt-1"
              type="number"
              min={1}
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: Number(e.target.value) }))}
            />
          </div>
          <div>
            <Label className="text-xs">Currency</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.currency}
              onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value as "NGN" | "USD" }))}
            >
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Flutterwave is always charged in NGN; a USD price is converted at the current rate.
            </p>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Course this unlocks</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.courseId ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, courseId: e.target.value }))}
            >
              <option value="">No course — takes payment only</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>{course.title}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Headline</Label>
            <Input
              className="mt-1"
              value={form.headline}
              onChange={(e) => setForm((prev) => ({ ...prev, headline: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Subheadline</Label>
            <Input
              className="mt-1"
              value={form.subheadline}
              onChange={(e) => setForm((prev) => ({ ...prev, subheadline: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">What they get (one per line)</Label>
            <Textarea
              className="mt-1"
              rows={5}
              value={form.bullets.join("\n")}
              onChange={(e) => setForm((prev) => ({ ...prev, bullets: toList(e.target.value) }))}
            />
          </div>
          <div>
            <Label className="text-xs">Button text</Label>
            <Input
              className="mt-1"
              value={form.ctaText}
              onChange={(e) => setForm((prev) => ({ ...prev, ctaText: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">Message after paying</Label>
            <Input
              className="mt-1"
              value={form.successMessage}
              onChange={(e) => setForm((prev) => ({ ...prev, successMessage: e.target.value }))}
            />
          </div>
        </div>

        <Button className="mt-4" onClick={() => save.mutate(form)} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
          Save payment settings
        </Button>
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
          <h3 className="text-sm font-semibold">Purchases</h3>
          <p className="text-xs text-muted-foreground">
            {(purchaseData?.paidCount ?? 0).toLocaleString()} paid
            {purchaseData?.paidAmount
              ? ` · ${formatCurrency(purchaseData.paidAmount, form.currency)}`
              : ""}
          </p>
        </div>
        {purchasesLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : purchases.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nobody has paid yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">Buyer</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {purchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {formatDate(purchase.paidAt ?? purchase.createdAt, "MMM d, HH:mm")}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs font-medium">{purchase.fullName}</p>
                      <p className="text-[11px] text-muted-foreground">{purchase.email} · {purchase.phone}</p>
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold">
                      {formatCurrency(purchase.amount, purchase.currency)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        variant={purchase.status === "paid" ? "success" : purchase.status === "failed" ? "destructive" : "warning"}
                        className="text-[10px]"
                      >
                        {purchase.status}
                      </Badge>
                      {purchase.failureReason ? (
                        <p className="mt-1 max-w-[16rem] truncate text-[11px] text-muted-foreground">{purchase.failureReason}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-[11px] text-muted-foreground">
                      {purchase.status !== "paid"
                        ? "—"
                        : [
                            purchase.accountCreated ? "account created" : "existing account",
                            purchase.courseGranted ? "course granted" : "course NOT granted",
                          ].join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
