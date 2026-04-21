import { requireSession } from "@/lib/session";
import { PaymentsHistory } from "@/components/dashboard/payments-history";

export const metadata = { title: "Payments — Dashboard" };

export default async function PaymentsPage() {
  await requireSession("user");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Payments</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          All your subscription payments and billing history.
        </p>
      </div>
      <PaymentsHistory />
    </div>
  );
}
