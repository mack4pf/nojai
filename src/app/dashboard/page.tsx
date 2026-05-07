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
  const params = await Promise.resolve(searchParams);
  return <DashboardOverview welcome={params?.welcome} selectedPlan={params?.plan} status={params?.status} />;
}