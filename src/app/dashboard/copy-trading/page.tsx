import { requireActiveSubscription } from "@/lib/session";
import { CopyTradingSettings } from "@/components/dashboard/copy-trading-settings";

export default async function DashboardCopyTradingPage() {
  await requireActiveSubscription();
  return <CopyTradingSettings />;
}