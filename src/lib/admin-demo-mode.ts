/**
 * Admin "Demo data" switch.
 *
 * When on, admin API requests carry `x-nojai-demo: 1` and the backend answers
 * them from the separate nojai_demo database (view-only). Real data is never
 * touched. Stored per browser, so it only affects the admin who turns it on.
 */
const STORAGE_KEY = "nojai-admin-demo-mode";

export function isAdminDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAdminDemoMode(on: boolean) {
  try {
    if (on) window.localStorage.setItem(STORAGE_KEY, "1");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked: the switch simply stays off
  }
}
