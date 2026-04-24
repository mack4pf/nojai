"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MonitorSmartphone,
  CreditCard,
  History,
  Users,
  Webhook as WebhookIcon,
  Settings,
  Star,
  Lock,
  LogOut,
  Menu,
  X,
  GraduationCap,
  Receipt,
} from "lucide-react";
import { signOut } from "next-auth/react";

import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/layout/brand-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon?: string;
  badge?: string;
  locked?: boolean;
  mobileBottom?: boolean;
}

interface DashboardNavProps {
  items: NavItem[];
  sessionName?: string | null;
  roleLabel: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  broker: MonitorSmartphone,
  plans: CreditCard,
  trades: History,
  copy: Users,
  webhook: WebhookIcon,
  settings: Settings,
  review: Star,
  courses: GraduationCap,
  payments: Receipt,
  affiliate: Users,
};

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  const Icon = ICON_MAP[item.icon ?? ""] ?? LayoutDashboard;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "bg-white/[0.08] text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
          : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
        item.locked && "opacity-50",
      )}
    >
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      <span className="flex-1">{item.label}</span>
      {item.locked ? <Lock className="h-3.5 w-3.5" /> : null}
      {item.badge && !item.locked ? (
        <Badge variant={active ? "default" : "secondary"} className="px-1.5 py-0 text-[10px]">
          {item.badge}
        </Badge>
      ) : null}
    </Link>
  );
}

export function DashboardNav({ items, sessionName, roleLabel }: DashboardNavProps) {
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const [mobileOpen, setMobileOpen] = useState(false);

  const explicitBottomItems = items.filter((item) => item.mobileBottom).slice(0, 5);
  const bottomItems = (explicitBottomItems.length > 0 ? explicitBottomItems : items.slice(0, 5)).slice(0, 5);
  const bottomItemHrefs = new Set(bottomItems.map((item) => item.href));
  const drawerItems = items.filter((item) => !bottomItemHrefs.has(item.href));

  // Add affiliate dashboard link if not present
  const navItems = items.some((item) => item.href === "/dashboard/affiliate")
    ? items
    : [
        ...items,
        {
          href: "/dashboard/affiliate",
          label: "Affiliate",
          icon: "affiliate",
        },
      ];
  return (
    <>
      {/* ── Mobile top bar (fixed at top) ── */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-white/10 bg-background/90 px-3 backdrop-blur-xl lg:hidden">
        <BrandLogo size="sm" />
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Spacer so page content isn't hidden behind the fixed header */}
      <div className="h-14 shrink-0 lg:hidden" />

      {/* ── Mobile slide-over nav (drawer items only) ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside
            className="absolute inset-y-0 right-0 flex w-72 flex-col border-l border-white/10 bg-[#0a0f16]/95 backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-14 items-center justify-between px-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">Navigation</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{roleLabel}</p>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
              {drawerItems.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={currentPath === item.href || (item.href !== "/dashboard" && currentPath.startsWith(item.href))}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </nav>

            <div className="border-t border-white/5 p-4">
              <div className="mb-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
                <p className="truncate text-xs font-medium text-foreground">{sessionName ?? "Trader"}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{roleLabel}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <LogOut className="h-[18px] w-[18px]" />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Mobile bottom nav bar ── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[76px] items-stretch border-t border-white/[0.08] bg-background/90 px-2 py-2 backdrop-blur-xl lg:hidden">
        {bottomItems.map((item) => {
          const Icon = ICON_MAP[item.icon ?? ""] ?? LayoutDashboard;
          const active = currentPath === item.href || (item.href !== "/dashboard" && currentPath.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold uppercase tracking-wider transition-colors",
                active ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:flex lg:w-[260px] lg:shrink-0 lg:flex-col lg:border-r lg:border-white/10">
        <div className="sticky top-0 flex h-screen flex-col overflow-y-auto">
          <div className="p-5 pb-4">
            <BrandLogo size="sm" />
          </div>

          <div className="px-4 pb-1 pt-2">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">Menu</p>
          </div>

          <nav className="flex-1 space-y-0.5 px-3">
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} active={currentPath === item.href} />
            ))}
          </nav>

          <div className="border-t border-white/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1 rounded-xl bg-white/[0.03] px-3 py-2.5">
                <p className="truncate text-xs font-medium text-foreground">{sessionName ?? "Trader"}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{roleLabel}</p>
              </div>
              <ThemeToggle />
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}