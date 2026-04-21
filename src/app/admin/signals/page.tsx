import { AdminSignalLog } from "@/components/admin/admin-signal-log";

export const metadata = { title: "Signals — Admin" };

export default function AdminSignalsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Signals</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Every signal received — asset, direction (buy or sell), execution result (win or loss), and martingale step used.
        </p>
      </div>
      <AdminSignalLog />
    </div>
  );
}
