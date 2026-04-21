import { AdminSignalsManager } from "@/components/admin/admin-signals-manager";

export const metadata = { title: "Trade History — Admin" };

export default function AdminTradesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Trade History</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Review every signal dispatch, the accounts it reached, execution outcomes, and martingale step usage.
        </p>
      </div>
      <AdminSignalsManager />
    </div>
  );
}