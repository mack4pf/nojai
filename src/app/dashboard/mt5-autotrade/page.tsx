import { requireForexSubscription } from "@/lib/session";
import { Mt5AutoTradeManager } from "@/components/dashboard/mt5-autotrade-manager";

export default async function DashboardMt5AutoTradePage() {
  // MT5 is VIP-only, and hiding the nav entry did not stop anyone
  // reaching this page by URL.
  await requireForexSubscription();
  return <Mt5AutoTradeManager />;
}
