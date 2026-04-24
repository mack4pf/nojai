import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/session";

const items = [
  { href: "/admin", label: "Overview", icon: "overview", mobileBottom: true },
  { href: "/admin/users", label: "Users", icon: "copy", mobileBottom: true },
  { href: "/admin/trades", label: "Trades", icon: "trades", mobileBottom: true },
  { href: "/admin/copy-trade", label: "Accounts", icon: "broker", mobileBottom: true },
  { href: "/admin/settings", label: "Settings", icon: "settings", mobileBottom: true },
  { href: "/admin/affiliate", label: "Affiliate", icon: "plans" },
  { href: "/admin/pricing", label: "Pricing", icon: "plans" },
  { href: "/admin/bots", label: "Bots", icon: "broker" },
  { href: "/admin/access-codes", label: "Access Codes", icon: "plans" },
  { href: "/admin/blog", label: "Blog", icon: "review" },
  { href: "/admin/courses", label: "Courses", icon: "trades" },
  { href: "/admin/reviews", label: "Reviews", icon: "review" },
  { href: "/admin/signals", label: "Signals", icon: "trades" },
  { href: "/admin/payments", label: "Payments", icon: "plans" },
  { href: "/admin/support", label: "Support", icon: "review" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession("admin");

  return (
    <AppShell
      sessionName={session.user.name}
      roleLabel="ADMIN"
      items={items}
    >
      {children}
    </AppShell>
  );
}