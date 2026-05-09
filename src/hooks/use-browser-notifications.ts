"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export type NotificationPermission = "default" | "granted" | "denied" | "unsupported";

export interface NotifyOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  silent?: boolean;
}

const ICON = "/icon-192.png";
const DISMISSED_KEY = "notif_prompt_dismissed";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function registerPushSubscription(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (!VAPID_PUBLIC_KEY) return;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await syncSubscription(existing);
      return;
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    await syncSubscription(sub);
  } catch {
    // Push subscription failed — notifications will still work while the app is open
  }
}

async function syncSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
  try {
    await api.post("/user/push-subscription", {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    });
  } catch {
    // Non-critical — fall back to socket-only notifications
  }
}

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as NotificationPermission);

    // If already granted, ensure SW + push subscription is registered
    if (Notification.permission === "granted") {
      registerPushSubscription();
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      if (result === "granted") await registerPushSubscription();
      return result;
    } catch {
      // Safari < 16 uses callback form
      return new Promise<NotificationPermission>((resolve) => {
        Notification.requestPermission(async (result) => {
          setPermission(result as NotificationPermission);
          if (result === "granted") await registerPushSubscription();
          resolve(result as NotificationPermission);
        });
      });
    }
  }, []);

  const notify = useCallback((title: string, options: NotifyOptions = {}) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
      new Notification(title, {
        icon: options.icon ?? ICON,
        badge: options.badge ?? ICON,
        body: options.body,
        tag: options.tag,
        silent: options.silent ?? false,
      });
    } catch {
      // Silently fail — push will still deliver when the tab is closed
    }
  }, []);

  const isDismissed = () => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DISMISSED_KEY) === "1";
  };

  const dismiss = () => {
    if (typeof window !== "undefined") localStorage.setItem(DISMISSED_KEY, "1");
  };

  const shouldShowPrompt = permission === "default" && !isDismissed();

  return { permission, requestPermission, notify, shouldShowPrompt, dismiss };
}
