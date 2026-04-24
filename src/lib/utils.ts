import { type ClassValue, clsx } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TRADE_AMOUNT_MINIMUMS: Record<string, number> = {
  USD: 1,
  NGN: 1500,
};

export const supportedTradeCurrencies = ["USD", "NGN"] as const;

export function normalizeCurrencyCode(currency?: string | null) {
  const value = String(currency ?? "").trim().toUpperCase();
  return value || null;
}

export function getTradeAmountMinimum(currency?: string | null) {
  const code = normalizeCurrencyCode(currency);
  if (!code) return 1;
  return TRADE_AMOUNT_MINIMUMS[code] ?? 1;
}

export function clampTradeAmountToCurrency(amount: number, currency?: string | null) {
  if (!Number.isFinite(amount)) return getTradeAmountMinimum(currency);
  return Math.max(amount, getTradeAmountMinimum(currency));
}

export function formatCurrency(value: number, currency?: string | null) {
  const amount = Number.isFinite(value) ? value : 0;
  const code = normalizeCurrencyCode(currency);

  if (!code) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(amount);
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)}`;
  }
}

export function formatSignedCurrency(value: number, currency?: string | null) {
  const amount = Number.isFinite(value) ? value : 0;
  return amount > 0 ? `+${formatCurrency(amount, currency)}` : formatCurrency(amount, currency);
}

export function aggregateCurrencyTotals(entries: Array<{ currency?: string | null; amount?: number | null }>) {
  const totals = new Map<string, { currency: string | null; total: number }>();

  for (const entry of entries) {
    const amount = Number(entry.amount ?? 0);
    if (!Number.isFinite(amount)) continue;

    const currency = normalizeCurrencyCode(entry.currency);
    const key = currency ?? "";
    const existing = totals.get(key);

    if (existing) {
      existing.total += amount;
      continue;
    }

    totals.set(key, { currency, total: amount });
  }

  return Array.from(totals.values()).sort((left, right) => (left.currency ?? "").localeCompare(right.currency ?? ""));
}

export function formatCurrencyBreakdown(entries: Array<{ currency?: string | null; amount?: number | null }>) {
  const totals = aggregateCurrencyTotals(entries);
  if (totals.length === 0) return formatCurrency(0);
  return totals.map((entry) => formatCurrency(entry.total, entry.currency)).join(" · ");
}

export function getTradeAmountRequirement(currency?: string | null) {
  const code = normalizeCurrencyCode(currency);
  const minimum = getTradeAmountMinimum(code);
  return code ? `Minimum ${formatCurrency(minimum, code)}` : `Minimum ${minimum}`;
}

export function formatDate(value?: string | Date, pattern = "MMM d, yyyy") {
  if (!value) return "-";
  return format(new Date(value), pattern);
}

export function formatTimeAgo(value?: string | Date) {
  if (!value) return "-";
  const date = new Date(value);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  
  return format(date, "MMM d, yyyy");
}

export function normalizeArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const maybeArray = (value as { data?: unknown; items?: unknown }).data ??
      (value as { items?: unknown }).items;
    if (Array.isArray(maybeArray)) return maybeArray as T[];
  }
  return [];
}

export function normalizeRecord<T>(value: unknown): T | null {
  if (value && typeof value === "object") {
    if ("data" in (value as Record<string, unknown>)) {
      return ((value as Record<string, unknown>).data as T) ?? null;
    }
    return value as T;
  }
  return null;
}

export function buildWebhookUrl(code?: string) {
  if (!code) return "Webhook not configured";
  return `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/webhooks/${code}`;
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          return `"${String(value).replaceAll('"', '""')}"`;
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}