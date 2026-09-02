import Image from "next/image";
import Link from "next/link";

import { BrandLogo } from "@/components/layout/brand-logo";

const productLinks = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#faq", label: "FAQ" },
  { href: "/dashboard", label: "Open dashboard" },
];

const nojaiLinks = [
  { href: "https://nojai.io", label: "All of NOJAI" },
  { href: "https://nojai.io/mt5-trading", label: "MT5 Trading" },
  { href: "https://nojai.io/about", label: "About" },
  { href: "https://nojai.io/contact", label: "Contact" },
];

const legalLinks = [
  { href: "https://nojai.io/privacy", label: "Privacy" },
  { href: "https://nojai.io/terms", label: "Terms" },
  { href: "https://nojai.io/risk-disclosure", label: "Risk disclosure" },
];

export function OlympSiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-black/20">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <BrandLogo size="sm" />
              <span className="h-5 w-px bg-white/10" />
              <Image
                src="/autobot-assets/olymptrade.jpeg"
                alt="Olymp Trade"
                width={18}
                height={18}
                className="h-[18px] w-[18px] rounded-md object-contain"
              />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Olymp Trade</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              Free automated trading on Olymp Trade, run by NOJAI. Register, deposit, get approved, and NOJAI
              trades your account automatically — no subscription, ever.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Product</p>
            <nav className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
              {productLinks.map((link) => (
                <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">NOJAI</p>
            <nav className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
              {nojaiLinks.map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Legal</p>
            <nav className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
              {legalLinks.map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/5 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} NOJAI. All rights reserved.</p>
          <p className="max-w-2xl sm:text-right">
            Trading involves risk, including the potential loss of your capital. Past performance does not
            guarantee future results — only trade with money you can afford to lose.
          </p>
        </div>
      </div>
    </footer>
  );
}
