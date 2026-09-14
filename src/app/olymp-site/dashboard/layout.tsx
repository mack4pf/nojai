import { AppShell } from "@/components/layout/app-shell";
import { getProfile } from "@/lib/api";
import { requireSession } from "@/lib/session";

export default async function OlympSiteDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession("user");
  const profile = session.accessToken ? await getProfile(session.accessToken).catch(() => null) : null;
  const hasOlympFreeAccess = Boolean(profile?.olympTradeFreeAccess);
  const hasActiveSubscription = Boolean(profile?.subscription?.active);
  const plan = profile?.subscription?.plan ?? profile?.plan ?? session.user.plan ?? "NONE";

  // Accounts on this subdomain are created through the Partner API and are
  // live the moment they exist -- there is no approval step here any more.
  // The old fallback label called every one of them "NOT APPROVED".
  const roleLabel = hasActiveSubscription ? plan : hasOlympFreeAccess ? "OLYMP FREE" : "OLYMP";

  const items = [
    { href: "/dashboard", label: "Dashboard", icon: "broker", mobileBottom: true },
    { href: "/dashboard/history", label: "History", icon: "trades", mobileBottom: true },
  ];

  return (
    <AppShell
      items={items}
      sessionName={profile?.name ?? session.user.name}
      roleLabel={roleLabel}
      showSupportChat
    >
      {children}
    </AppShell>
  );
}
