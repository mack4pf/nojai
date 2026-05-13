import { AppShell } from "@/components/layout/app-shell";
import { getProfile } from "@/lib/api";
import { requireSession } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession("user");
  const profile = session.accessToken ? await getProfile(session.accessToken).catch(() => null) : null;
  const hasActiveSubscription = Boolean(profile?.subscription?.active);
  const plan = profile?.subscription?.plan ?? profile?.plan ?? session.user.plan ?? "NONE";

  const lockedItems = [
    { href: "/dashboard/subscription", label: "Choose a Plan", icon: "plans", badge: "Required", mobileBottom: true },
    { href: "/dashboard/affiliate", label: "Affiliate", icon: "plans" },
  ];

  const activeItems = [
    { href: "/dashboard", label: "Overview", icon: "overview", mobileBottom: true },
    { href: "/dashboard/accounts", label: "Broker", icon: "broker", mobileBottom: true },
    { href: "/dashboard/trades", label: "Trades", icon: "trades", mobileBottom: true },
    { href: "/dashboard/review", label: "Review", icon: "review", mobileBottom: true },
    { href: "/dashboard/subscription", label: "Plans", icon: "plans", mobileBottom: true },
    { href: "/dashboard/copy-trading", label: "Copy Trading", icon: "copy", badge: "Pro", locked: plan === "STANDARD" || plan === "NONE" },
    { href: "/dashboard/webhook", label: "Webhook", icon: "webhook", badge: "Pro", locked: plan === "STANDARD" || plan === "NONE" },
    { href: "/dashboard/courses", label: "Courses", icon: "courses" },
    { href: "/dashboard/payments", label: "Payments", icon: "payments" },
    { href: "/dashboard/affiliate", label: "Affiliate", icon: "plans" },
    { href: "/dashboard/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <AppShell
      items={hasActiveSubscription ? activeItems : lockedItems}
      sessionName={profile?.name ?? session.user.name}
      roleLabel={hasActiveSubscription ? plan : "NO PLAN"}
      showSupportChat
    >
      {children}
    </AppShell>
  );
}