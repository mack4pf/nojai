import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/session";

const items = [
  { href: "/admin", label: "Overview", icon: "overview", mobileBottom: true },
  { href: "/admin/analytics", label: "Analytics", icon: "trending", mobileBottom: true },
  { href: "/admin/users", label: "Users", icon: "copy", mobileBottom: true },
  { href: "/admin/trades", label: "Trades", icon: "trades", mobileBottom: true },
  { href: "/admin/copy-trade", label: "Accounts", icon: "broker", mobileBottom: true },
  { href: "/admin/mt5-copy-trading", label: "MT5 Copy", icon: "copy", mobileBottom: true },
  { href: "/admin/mt5", label: "MT5", icon: "zap", mobileBottom: true },
  { href: "/admin/mt5-strategies", label: "MT5 Strategies", icon: "webhook" },
  { href: "/admin/settings", label: "Settings", icon: "settings", mobileBottom: true },
  { href: "/admin/pricing", label: "Pricing", icon: "plans" },
  { href: "/admin/bots", label: "Bots", icon: "bot" },
  { href: "/admin/access-codes", label: "Access Codes", icon: "key" },
  { href: "/admin/blog", label: "Blog", icon: "document" },
  { href: "/admin/courses", label: "Courses", icon: "courses" },
  { href: "/admin/reviews", label: "Reviews", icon: "review" },
  { href: "/admin/signals", label: "Signals", icon: "zap" },
  { href: "/admin/payments", label: "Payments", icon: "wallet" },
  { href: "/admin/affiliates", label: "Affiliates", icon: "network" },
  { href: "/admin/support", label: "Support", icon: "message" },
  { href: "/admin/connected-accounts", label: "Broker Accounts", icon: "broker" },
  { href: "/admin/logs", label: "System Logs", icon: "terminal" },
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
