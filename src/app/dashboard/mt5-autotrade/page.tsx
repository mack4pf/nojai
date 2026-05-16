import { requireActiveSubscription } from "@/lib/session";
import { Mt5AutoTradeManager } from "@/components/dashboard/mt5-autotrade-manager";

export default async function DashboardMt5AutoTradePage() {
  await requireActiveSubscription();
  return <Mt5AutoTradeManager />;
}
