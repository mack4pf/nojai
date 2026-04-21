import { requireSession } from "@/lib/session";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

interface DashboardPageProps {
  searchParams?: {
    welcome?: string;
    plan?: string;
    status?: string;
  };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  await requireSession("user");
  return <DashboardOverview welcome={searchParams?.welcome} selectedPlan={searchParams?.plan} status={searchParams?.status} />;
}