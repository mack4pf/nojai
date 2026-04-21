import { DashboardNav } from "@/components/layout/dashboard-nav";
import { SupportChat } from "@/components/dashboard/support-chat";

interface NavItem {
  href: string;
  label: string;
  icon?: string;
  badge?: string;
  locked?: boolean;
  mobileBottom?: boolean;
}

interface AppShellProps {
  items: NavItem[];
  sessionName?: string | null;
  roleLabel: string;
  children: React.ReactNode;
  showSupportChat?: boolean;
}

export function AppShell({ items, sessionName, roleLabel, children, showSupportChat }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <DashboardNav items={items} sessionName={sessionName} roleLabel={roleLabel} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-4 py-4 pb-24 sm:px-6 sm:py-6 lg:px-8 lg:py-8 lg:pb-8">{children}</div>
      </main>
      {showSupportChat ? <SupportChat /> : null}
    </div>
  );
}