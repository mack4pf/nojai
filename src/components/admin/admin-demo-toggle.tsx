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
    <div
      className={
        on
          ? "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm"
          : "mb-4 flex items-center justify-end gap-2 text-xs text-muted-foreground"
      }
    >
      {on && (
        <span className="font-medium text-amber-700 dark:text-amber-300">
          Demo data — these users, payments and profits are sample data, not real customers.
        </span>
      )}
      <label className="flex items-center gap-2">
        <span>Demo data</span>
        <Switch checked={on} onCheckedChange={toggle} aria-label="Show demo data" />
      </label>
    </div>
  );
}
