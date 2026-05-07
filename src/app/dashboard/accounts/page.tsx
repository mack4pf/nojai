import { Suspense } from "react";

import { requireActiveSubscription } from "@/lib/session";
import { AccountsManager } from "@/components/dashboard/accounts-manager";

export default async function DashboardAccountsPage() {
  await requireActiveSubscription();
  return (
    <Suspense fallback={null}>
      <AccountsManager />
    </Suspense>
  );
}