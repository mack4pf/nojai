import { SubscriptionManager } from "@/components/dashboard/subscription-manager";

interface SubscriptionPageProps {
  searchParams: {
    status?: string;
    required?: string;
    plan?: string;
  };
}

export default function DashboardSubscriptionPage({ searchParams }: SubscriptionPageProps) {
  return <SubscriptionManager status={searchParams.status} required={searchParams.required} selectedPlan={searchParams.plan} />;
}