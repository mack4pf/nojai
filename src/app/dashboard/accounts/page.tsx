import { requireActiveSubscription } from "@/lib/session";
import { AccountsManager } from "@/components/dashboard/accounts-manager";

export default async function DashboardAccountsPage() {
  await requireActiveSubscription();
  return <AccountsManager />;
}