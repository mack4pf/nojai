import { requireSession } from "@/lib/session";
import { AffiliateDashboard } from "@/components/dashboard/affiliate-dashboard";

export default async function DashboardAffiliatePage() {
  await requireSession("user");
  return <AffiliateDashboard />;
}
