import { Suspense } from "react";

import { OlympConnectPage } from "@/components/dashboard/olymp-connect-page";

export default function DashboardOlympConnectPage() {
  return (
    <Suspense fallback={null}>
      <OlympConnectPage />
    </Suspense>
  );
}
