import { Suspense } from "react";

import { OlympPartnerAccount } from "@/components/dashboard/olymp-partner-account";
import { OlympTradeDashboardPage } from "@/components/dashboard/olymp-trade-dashboard-page";

export default function OlympSiteDashboardPage() {
  return (
    <div className="space-y-5">
      <Suspense fallback={null}>
        <OlympPartnerAccount />
      </Suspense>
      <Suspense fallback={null}>
        <OlympTradeDashboardPage />
      </Suspense>
    </div>
  );
}
