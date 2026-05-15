"use client";

import { useState } from "react";
import { AdminSignalsManager } from "@/components/admin/admin-signals-manager";
import { AdminMt5TradesManager } from "@/components/admin/admin-mt5-trades-manager";

type Tab = "iq-eo" | "mt5";

export default function AdminTradesPage() {
  const [tab, setTab] = useState<Tab>("iq-eo");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Trade History</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Review every signal dispatch, execution outcomes, and MT5 trades across all users.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1 max-w-sm">
        <button
          onClick={() => setTab("iq-eo")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === "iq-eo"
              ? "bg-white/[0.08] text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          IQ &amp; EO Signals
        </button>
        <button
          onClick={() => setTab("mt5")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === "mt5"
              ? "bg-white/[0.08] text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          MT5 AutoTrade
        </button>
      </div>

      {tab === "iq-eo" ? <AdminSignalsManager /> : <AdminMt5TradesManager />}
    </div>
  );
}
