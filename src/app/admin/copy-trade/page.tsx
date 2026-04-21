import { AdminCopyTradeManager } from "@/components/admin/admin-copy-trade-manager";

export const metadata = { title: "Copy-Trade — Admin" };

export default function AdminCopyTradePage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Copy-Trade Management</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Manage admin copy trading, choose VIP and PRO signal sources, connect accounts, and set trade amounts.
        </p>
      </div>
      <AdminCopyTradeManager />
    </div>
  );
}
