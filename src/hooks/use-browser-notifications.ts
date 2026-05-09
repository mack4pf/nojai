"use client";

import { useCallback, useEffect, useState } from "react";

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

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as NotificationPermission);
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      return result;
    } catch {
      // Safari < 16 uses callback form
      return new Promise<NotificationPermission>((resolve) => {
        Notification.requestPermission((result) => {
          setPermission(result as NotificationPermission);
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
      // Silently fail — some browsers restrict new Notification() in certain contexts
    }
  }, []);

  const isDismissed = () => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DISMISSED_KEY) === "1";
  };

  const dismiss = () => {
    if (typeof window !== "undefined") localStorage.setItem(DISMISSED_KEY, "1");
  };

  const shouldShowPrompt =
    permission === "default" && !isDismissed();

  return { permission, requestPermission, notify, shouldShowPrompt, dismiss };
}
