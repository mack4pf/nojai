"use client";

import Link from "next/link";
import { useState } from "react";

import { useSession } from "next-auth/react";
import { ArrowUpRight, Menu, X } from "lucide-react";

import { BrandLogo } from "@/components/layout/brand-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/#features", label: "Features" },
  { href: "/mt5-trading", label: "MT5 Trading" },
  { href: "/blog", label: "Blog" },
  { href: "/#brokers", label: "Our Brokers" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="glass-panel relative overflow-hidden rounded-[30px] px-4 py-3 sm:px-5">
          <div className="pointer-events-none absolute inset-x-20 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
          <div className="pointer-events-none absolute -left-16 top-0 h-24 w-32 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-2 h-20 w-28 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="flex items-center gap-3">
            <BrandLogo size="md" priority />

            <div className="hidden min-w-0 flex-1 justify-center lg:flex">
              <nav className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.08] p-1 text-sm font-semibold text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-full px-4 py-2 transition-colors hover:bg-white/[0.12] hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden xl:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-semibold text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Live broker automation
              </div>
              <ThemeToggle />
              {session ? (
                <Button asChild className="hidden sm:inline-flex">
                  <Link href={session.user.role === "admin" ? "/admin" : "/dashboard"}>
                    Open dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" className="hidden md:inline-flex">
                    <Link href="/auth/login">Login</Link>
                  </Button>
                  <Button asChild className="hidden sm:inline-flex">
                    <Link href="/auth/register">
                      Start now
                      <ArrowUpRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </>
              )}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="lg:hidden"
                onClick={() => setMobileOpen((value) => !value)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {mobileOpen ? (
            <div className="mt-4 border-t border-white/10 pt-4 lg:hidden">
              <nav className="grid gap-2">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {session ? (
                  <Button asChild className="w-full sm:w-auto">
                    <Link href={session.user.role === "admin" ? "/admin" : "/dashboard"}>Open dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="ghost" className="w-full sm:w-auto">
                      <Link href="/auth/login">Login</Link>
                    </Button>
                    <Button asChild className="w-full sm:w-auto">
                      <Link href="/auth/register">Start now</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}