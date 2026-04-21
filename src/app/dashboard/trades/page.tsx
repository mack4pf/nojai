import { requireActiveSubscription } from "@/lib/session";
import { TradesHistory } from "@/components/dashboard/trades-history";

export default async function DashboardTradesPage() {
  await requireActiveSubscription();
  return <TradesHistory />;
}