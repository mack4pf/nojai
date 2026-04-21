import { AdminPaymentsManager } from "@/components/admin/admin-payments-manager";

export const metadata = { title: "Payments — Admin" };

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Payments</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          All subscription payments — received, pending, expired, and cancelled — with amounts, methods, and references.
        </p>
      </div>
      <AdminPaymentsManager />
    </div>
  );
}
