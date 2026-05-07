import { SubscriptionManager } from "@/components/dashboard/subscription-manager";

interface SubscriptionPageProps {
  searchParams: {
    status?: string;
    required?: string;
    plan?: string;
  };
}

export default async function DashboardSubscriptionPage({ searchParams }: SubscriptionPageProps) {
  const params = await Promise.resolve(searchParams);
  return <SubscriptionManager status={params.status} required={params.required} selectedPlan={params.plan} />;
}