import { Suspense } from "react";

import { OlympTradeDashboardPage } from "@/components/dashboard/olymp-trade-dashboard-page";

export default function OlympSiteDashboardPage() {
  return (
    <Suspense fallback={null}>
      <OlympTradeDashboardPage />
    </Suspense>
  );
}
