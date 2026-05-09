import Link from "next/link";
import { Playfair_Display } from "next/font/google";

import { Mail, Rss, Search, Share2, UserCircle } from "lucide-react";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

const navItems = [
  { href: "/blog", label: "Journal" },
  { href: "/#brokers", label: "Brokers" },
  { href: "/copy-trading-for-beginners", label: "Copy Trading" },
  { href: "/courses", label: "Courses" },
  { href: "/contact", label: "Support" },
];

export function BlogEditorialShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fcf9f8] text-[#1c1b1b] antialiased">
      <header className="sticky top-0 z-50 border-b border-[#c1c8c7] bg-[#fcf9f8]">
        <nav className="mx-auto flex h-20 max-w-[1200px] items-center justify-between px-5 md:px-8">
          <Link href="/blog" className={`${playfair.className} text-3xl font-bold tracking-tight text-[#032121] md:text-5xl`}>
            NOJAI Journal
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {navItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={`pb-1 text-sm font-semibold uppercase tracking-[0.12em] transition-colors ${
                  index === 0
                    ? "border-b-2 border-[#032121] text-[#032121]"
                    : "text-[#414848] hover:text-[#032121]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-4 text-[#032121]">
            <Search className="h-5 w-5" />
            <Link href="/auth/login" aria-label="Login">
              <UserCircle className="h-6 w-6" />
            </Link>
          </div>
        </nav>
      </header>

      {children}

      <footer className="mt-20 border-t border-[#c1c8c7] bg-[#f0edec]">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-12 md:grid-cols-4 md:px-8">
          <div>
            <div className={`${playfair.className} text-2xl font-semibold text-[#032121]`}>NOJAI Journal</div>
            <p className="mt-4 text-sm leading-6 text-[#414848]">
              Practical trading automation notes, broker setup guides, and platform updates from the NOJAI team.
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#032121]">Platform</h3>
            <Link className="block text-sm text-[#414848] hover:text-[#032121]" href="/#brokers">Brokers</Link>
            <Link className="block text-sm text-[#414848] hover:text-[#032121]" href="/courses">Courses</Link>
            <Link className="block text-sm text-[#414848] hover:text-[#032121]" href="/auth/register">Start now</Link>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#032121]">Company</h3>
            <Link className="block text-sm text-[#414848] hover:text-[#032121]" href="/about">About</Link>
            <Link className="block text-sm text-[#414848] hover:text-[#032121]" href="/contact">Contact</Link>
            <Link className="block text-sm text-[#414848] hover:text-[#032121]" href="/risk-disclosure">Risk Disclosure</Link>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#032121]">Follow</h3>
            <div className="mt-4 flex gap-4 text-[#414848]">
              <Share2 className="h-5 w-5" />
              <Rss className="h-5 w-5" />
              <Mail className="h-5 w-5" />
            </div>
            <p className="mt-6 text-xs text-[#414848]">© 2026 NOJAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
