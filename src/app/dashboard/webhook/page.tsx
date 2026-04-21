import { DashboardWebhookPage } from "@/components/dashboard/dashboard-webhook-page";
import { requireActiveSubscription } from "@/lib/session";

export default async function WebhookPage() {
  await requireActiveSubscription();
  return <DashboardWebhookPage />;
}