import { AppShell } from "@/components/layout/app-shell";
import { getProfile } from "@/lib/api";
import { requireSession } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession("user");
  const profile = session.accessToken ? await getProfile(session.accessToken).catch(() => null) : null;
  const hasActiveSubscription = Boolean(profile?.subscription?.active);
  const plan = profile?.subscription?.plan ?? profile?.plan ?? session.user.plan ?? "NONE";
  const access = profile?.subscription?.access ?? { binary: false, forex: false };
  const hasBinary = access.binary;
  const hasForex = access.forex;

  const lockedItems = [
    { href: "/dashboard/subscription", label: "Choose a Plan", icon: "plans", badge: "Required", mobileBottom: true },
    { href: "/dashboard/affiliate", label: "Affiliate", icon: "plans" },
  ];

  const allItems = [
    { href: "/dashboard", label: "Overview", icon: "overview", mobileBottom: true, show: true },
    { href: "/dashboard/accounts", label: "Broker", icon: "broker", mobileBottom: true, show: hasBinary },
    { href: "/dashboard/mt5-autotrade", label: "MT5", icon: "mt5", badge: "New", mobileBottom: true, show: hasForex },
    { href: "/dashboard/trades", label: "Trades", icon: "trades", mobileBottom: true, show: true },
    { href: "/dashboard/review", label: "Review", icon: "review", mobileBottom: true, show: true },
    { href: "/dashboard/subscription", label: "Plans", icon: "plans", mobileBottom: true, show: true },
    { href: "/dashboard/copy-trading", label: "Copy Trading", icon: "copy", badge: "Pro", locked: plan === "STANDARD" || plan === "NONE", show: hasBinary || hasForex },
    { href: "/dashboard/webhook", label: "Webhook", icon: "webhook", badge: "Pro", locked: plan === "STANDARD" || plan === "NONE", show: hasBinary || hasForex },
    { href: "/dashboard/courses", label: "Courses", icon: "courses", show: true },
    { href: "/dashboard/payments", label: "Payments", icon: "payments", show: true },
    { href: "/dashboard/affiliate", label: "Affiliate", icon: "plans", show: true },
    { href: "/dashboard/settings", label: "Settings", icon: "settings", show: true },
  ];

  const activeItems = allItems
    .filter((item) => item.show)
    .map(({ show: _, ...rest }) => rest);

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
