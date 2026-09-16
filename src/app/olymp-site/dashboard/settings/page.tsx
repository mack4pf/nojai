import { DashboardWebhookPage } from "@/components/dashboard/dashboard-webhook-page";
import { OlympMartingaleSettings } from "@/components/dashboard/olymp-martingale-settings";

export default function OlympSiteSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Settings</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          How much the bot stakes, and how it reacts to a loss.
        </p>
      </div>

      <OlympMartingaleSettings />

      <div className="border-t border-white/[0.06] pt-8">
        <DashboardWebhookPage />
      </div>
    </div>
  );
}
