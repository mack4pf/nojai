import { Suspense } from "react";

import { OlympTradeHistoryPage } from "@/components/dashboard/olymp-trade-history-page";

export default function OlympSiteDashboardHistoryPage() {
  return (
    <Suspense fallback={null}>
      <OlympTradeHistoryPage />
    </Suspense>
  );
}
