import Image from "next/image";
import Link from "next/link";

import { BrandLogo } from "@/components/layout/brand-logo";

export function OlympSiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/20">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between lg:px-8">
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
          <p className="mt-2 max-w-md">
            Free automated trading on Olymp Trade, run by NOJAI. Trading involves risk — only trade with money you can afford to lose.
          </p>
        </div>
        <div className="flex flex-wrap gap-5">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#faq">FAQ</Link>
          <a href="https://nojai.io" target="_blank" rel="noreferrer">All of NOJAI</a>
          <a href="https://nojai.io/privacy" target="_blank" rel="noreferrer">Privacy</a>
          <a href="https://nojai.io/terms" target="_blank" rel="noreferrer">Terms</a>
          <a href="https://nojai.io/risk-disclosure" target="_blank" rel="noreferrer">Risk</a>
        </div>
      </div>
    </footer>
  );
}
