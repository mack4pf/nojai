"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, X, Zap } from "lucide-react";

import { useBrowserNotifications } from "@/hooks/use-browser-notifications";
import { Button } from "@/components/ui/button";

export function NotificationPermissionPrompt() {
  const { permission, requestPermission, shouldShowPrompt, dismiss } = useBrowserNotifications();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);

  // Delay mount so it doesn't flash on first render
  useEffect(() => {
    if (shouldShowPrompt) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, [shouldShowPrompt]);

  // Show a "how to re-enable" tip if user previously denied
  useEffect(() => {
    if (permission === "denied") setDenied(true);
  }, [permission]);

  if (!visible && !denied) return null;

  // User has already granted — nothing to show
  if (permission === "granted") return null;

  // Browser doesn't support notifications at all
  if (permission === "unsupported") return null;

  const handleAllow = async () => {
    setLoading(true);
    const result = await requestPermission();
    setLoading(false);
    if (result === "granted" || result === "denied") {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    dismiss();
    setVisible(false);
    setDenied(false);
  };

  if (denied) {
    return (
      <div
        className={`
          flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06]
          p-4 text-sm transition-all duration-300
          ${denied ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}
        `}
      >
        <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <div className="flex-1 space-y-1">
          <p className="font-semibold text-amber-300">Notifications are blocked</p>
          <p className="text-amber-400/80">
            To get trade alerts, click the <strong>lock / info icon</strong> in your browser address bar
            and set <strong>Notifications</strong> to <strong>Allow</strong>.
          </p>
        </div>
        <button onClick={handleDismiss} className="shrink-0 rounded-lg p-1 text-amber-400/60 hover:text-amber-300 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`
        relative overflow-hidden rounded-3xl border border-primary/20 bg-primary/[0.05]
        p-5 transition-all duration-500
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"}
      `}
    >
      {/* Subtle glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground">Enable trade notifications</p>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                <Zap className="h-3 w-3" /> Live
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Get instant browser alerts when your trades are placed or completed — even when this tab is in the background.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            onClick={handleAllow}
            disabled={loading}
            size="sm"
            className="rounded-xl"
          >
            <Bell className="mr-2 h-4 w-4" />
            {loading ? "Asking…" : "Allow alerts"}
          </Button>
          <button
            onClick={handleDismiss}
            className="rounded-xl p-2 text-muted-foreground hover:bg-white/[0.05] hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
