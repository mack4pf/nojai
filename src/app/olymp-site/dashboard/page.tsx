import { Suspense } from "react";

import { OlympPartnerDashboardPage } from "@/components/dashboard/olymp-partner-dashboard-page";

export default function OlympSiteDashboardPage() {
  return (
    <Suspense fallback={null}>
      <OlympPartnerDashboardPage />
    </Suspense>
  );
}
