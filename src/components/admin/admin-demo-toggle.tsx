"use client";

import { useEffect, useState } from "react";

import { Switch } from "@/components/ui/switch";
import { isAdminDemoMode, setAdminDemoMode } from "@/lib/admin-demo-mode";

/**
 * "Demo data" switch for the admin panel. While on, every admin page reads
 * the demo backend (nojai_demo) and a banner stays visible so demo numbers
 * are never mistaken for real ones.
 */
export function AdminDemoToggle() {
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOn(isAdminDemoMode());
    setReady(true);
  }, []);

  if (!ready) return null;

  const toggle = (next: boolean) => {
    setAdminDemoMode(next);
    // Reload so every cached admin query refetches from the right backend.
    window.location.reload();
  };

  return (
    <div className="mb-3 flex items-center justify-end">
      <label
        className={
          on
            ? "flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300"
            : "flex items-center gap-1.5 text-[11px] text-muted-foreground"
        }
        title={on ? "Showing sample demo data, not real customers" : "Show sample demo data"}
      >
        <span>{on ? "Demo" : "Demo data"}</span>
        <Switch className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 [&>span[data-state=checked]]:translate-x-3" checked={on} onCheckedChange={toggle} aria-label="Show demo data" />
      </label>
    </div>
  );
}
