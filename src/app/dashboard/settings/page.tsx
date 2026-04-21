import { requireActiveSubscription } from "@/lib/session";
import { SettingsForm } from "@/components/dashboard/settings-form";

export default async function DashboardSettingsPage() {
  await requireActiveSubscription();
  return <SettingsForm />;
}