import Link from "next/link";

import { BrandLogo } from "@/components/layout/brand-logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/20">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <BrandLogo size="sm" />
          <p className="mt-2 max-w-md">
            Trading operations, subscription billing, automation, education, and review management in one platform.
          </p>
        </div>
        <div className="flex flex-wrap gap-5">
          <Link href="/#features">Features</Link>
          <Link href="/#brokers">Our Brokers</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/risk-disclosure">Risk</Link>
          <Link href="/ai">AI</Link>
        </div>
      </div>
    </footer>
  );
}