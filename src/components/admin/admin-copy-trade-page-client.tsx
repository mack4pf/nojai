"use client";

import { useState } from "react";

import Image from "next/image";

import { AdminCopyTradeManager } from "@/components/admin/admin-copy-trade-manager";
import { AdminEoCopyTradeManager } from "@/components/admin/admin-eo-copy-trade-manager";
import { AdminMt5CopyTradeManager } from "@/components/admin/admin-mt5-copy-trade-manager";
import { MetaTrader5Icon } from "@/components/icons/metatrader5-icon";

type Platform = "iq" | "eo" | "mt5";

const PLATFORMS: { key: Platform; label: string; sub: string }[] = [
  { key: "iq",  label: "IQ Option",     sub: "Binary / Turbo" },
  { key: "eo",  label: "Expert Option", sub: "Binary / Turbo" },
  { key: "mt5", label: "MetaTrader 5",  sub: "Forex / CFD"    },
];

function PlatformIcon({ platform }: { platform: Platform }) {
  if (platform === "mt5") {
    return <MetaTrader5Icon className="h-5 w-5" />;
  }
  const src =
    platform === "iq"
      ? "/autobot-assets/iq-option-small.svg"
      : "/autobot-assets/experoptionlogo.png";
  return (
    <div className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-md bg-white p-0.5">
      <Image src={src} alt={platform} width={16} height={16} className="h-4 w-4 object-contain" />
    </div>
  );
}

export function AdminCopyTradePageClient() {
  const [active, setActive] = useState<Platform>("iq");

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
          Copy-Trade Management
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Manage admin copy trading accounts across IQ Option, Expert Option and MetaTrader 5.
        </p>
      </div>

      {/* Platform switcher */}
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map(({ key, label, sub }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActive(key)}
            className={`flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-left transition-all ${
              active === key
                ? "border-primary/60 bg-primary/10 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]"
                : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-white/20 hover:bg-white/[0.04] hover:text-foreground"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                active === key ? "bg-primary/20" : "bg-white/[0.06]"
              }`}
            >
              <PlatformIcon platform={key} />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-tight">{label}</span>
              <span className="block text-[11px] leading-tight opacity-60">{sub}</span>
            </span>
            {active === key && (
              <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.06]" />

      {/* Tab content */}
      {active === "iq"  && <AdminCopyTradeManager />}
      {active === "eo"  && <AdminEoCopyTradeManager />}
      {active === "mt5" && <AdminMt5CopyTradeManager />}
    </div>
  );
}
