import axios from "axios";
import { getSession } from "next-auth/react";

import type {
  BlogPost,
  Bot,
  Course,
  DashboardStats,
  IQAccount,
  PaginatedResponse,
  PlanTier,
  PricingPlan,
  Review,
  Trade,
  UserProfile,
} from "@/types";
import { normalizeArray, normalizeRecord } from "@/lib/utils";

const DEFAULT_API_BASE_URL = "http://localhost:5000/api";
const DEFAULT_BACKEND_URL = "http://localhost:5000";

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function resolveServerApiBaseUrl() {
  return trimTrailingSlash(
    process.env.API_URL
      ?? process.env.BACKEND_API_URL
      ?? process.env.NEXT_PUBLIC_API_URL
      ?? DEFAULT_API_BASE_URL,
  );
}

function resolveServerPublicBaseUrl() {
  const directApiUrl = resolveServerApiBaseUrl();
  const isLocalApi = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api$/i.test(directApiUrl);
  const vercelOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  const appOrigin =
    vercelOrigin
    || process.env.NEXT_PUBLIC_APP_URL
    || process.env.NEXT_PUBLIC_SITE_URL
    || "";

  if (isLocalApi && appOrigin) {
    return `${trimTrailingSlash(appOrigin)}/backend`;
  }

  return directApiUrl;
}

/** Direct backend origin, safe for both server and client (uses NEXT_PUBLIC_ on client). */
function resolveBackendOrigin() {
  return trimTrailingSlash(
    process.env.NEXT_PUBLIC_BACKEND_URL
      ?? process.env.BACKEND_URL
      ?? DEFAULT_BACKEND_URL,
  );
}

export const API_BASE_URL = "/backend";
export const SOCKET_PROXY_PATH = "/socket.io";
export const SERVER_API_BASE_URL = resolveServerApiBaseUrl();
/** Backend origin (e.g. http://localhost:5000) — available on both server and client. */
export const BACKEND_ORIGIN = resolveBackendOrigin();

function toPlanTier(value?: string | null): PlanTier {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "STANDARD" || normalized === "PRO" || normalized === "VIP") {
    return normalized;
  }
  return "NONE";
}

function mapPricingPlan(value: unknown): PricingPlan {
  const plan = (value ?? {}) as Record<string, unknown>;
  const tier = toPlanTier((plan.plan as string | undefined) ?? (plan.tier as string | undefined));

  return {
    _id: String(plan._id ?? plan.id ?? plan.plan ?? tier.toLowerCase()),
    name: String(plan.name ?? tier),
    slug: String(plan.slug ?? plan.plan ?? tier.toLowerCase()),
    tier,
    planKey: String(plan.plan ?? tier.toLowerCase()),
    price: Number(plan.price ?? plan.priceUSD ?? 0),
    currency: String(plan.currency ?? ""),
    durationInDays: Number(plan.durationInDays ?? plan.durationDays ?? 30),
    features: normalizeArray<string>(plan.features),
    isPopular: Boolean(plan.isPopular ?? tier === "PRO"),
  };
}

export function normalizeUserProfile(value: unknown): UserProfile | null {
  const record = normalizeRecord<Record<string, unknown>>(value);
  if (!record) return null;

  const subscriptionRecord = record.subscription as Record<string, unknown> | undefined;
  const expiresAt = String(subscriptionRecord?.expiresAt ?? record.subscriptionExpiresAt ?? "");
  const startedAt = String(subscriptionRecord?.startedAt ?? record.subscriptionStartedAt ?? "");
  const active = Boolean(subscriptionRecord?.active ?? (expiresAt ? new Date(expiresAt) > new Date() : false));
  const plan = toPlanTier((subscriptionRecord?.plan as string | undefined) ?? (record.plan as string | undefined));

  return {
    _id: String(record._id ?? record.id ?? ""),
    name: String(record.name ?? record.fullName ?? record.email ?? "User"),
    fullName: typeof record.fullName === "string" ? record.fullName : undefined,
    email: String(record.email ?? ""),
    role: (record.role as "user" | "admin") ?? "user",
    plan,
    subscription: {
      active,
      plan,
      expiresAt: expiresAt || undefined,
      status: typeof subscriptionRecord?.status === "string" ? subscriptionRecord.status : undefined,
      startedAt: startedAt || undefined,
      createdAt: typeof subscriptionRecord?.createdAt === "string" ? subscriptionRecord.createdAt : undefined,
      amount: typeof subscriptionRecord?.amount === "number" ? subscriptionRecord.amount : undefined,
      currency: typeof subscriptionRecord?.currency === "string" ? subscriptionRecord.currency : undefined,
      paymentMethod: typeof subscriptionRecord?.paymentMethod === "string" ? subscriptionRecord.paymentMethod : undefined,
    },
    iqAccounts: normalizeArray<IQAccount>(record.iqAccounts),
    subscriptionId: typeof record.subscriptionId === "string" ? record.subscriptionId : undefined,
    subscriptionExpiresAt: expiresAt || undefined,
    subscriptionStartedAt: startedAt || undefined,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
    joinedAt: typeof record.joinedAt === "string" ? record.joinedAt : typeof record.createdAt === "string" ? record.createdAt : undefined,
    martingaleSteps: typeof record.martingaleSteps === "number" ? record.martingaleSteps : undefined,
    copyTradingEnabled: typeof record.copyTradingEnabled === "boolean" ? record.copyTradingEnabled : undefined,
    webhookCode: typeof record.webhookCode === "string" ? record.webhookCode : undefined,
  };
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const session = await getSession();

  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ?? error.message ?? "Request failed";

    return Promise.reject(new Error(message));
  },
);

export function createServerApi(accessToken?: string) {
  return axios.create({
    baseURL: SERVER_API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
}

export async function publicGet<T>(path: string): Promise<T> {
  const baseUrl = typeof window !== "undefined" ? API_BASE_URL : resolveServerPublicBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }

  return response.json() as Promise<T>;
}

export async function getPricingPlans() {
  const response = await publicGet<unknown>("/pricing");
  return normalizeArray<unknown>(response).map(mapPricingPlan);
}

export async function getPublicReviews() {
  const response = await publicGet<unknown>("/reviews");
  return normalizeArray<Review>(response);
}

export async function getBlogPosts() {
  const response = await publicGet<unknown>("/blog");
  // Backend returns { posts: [...], total, page, pages }
  if (response && typeof response === "object" && "posts" in (response as Record<string, unknown>)) {
    return normalizeArray<BlogPost>((response as Record<string, unknown>).posts);
  }
  return normalizeArray<BlogPost>(response);
}

export async function getBlogPost(slug: string) {
  if (!slug || slug === "undefined") return null;
  const response = await publicGet<unknown>(`/blog/${encodeURIComponent(slug)}`);
  return normalizeRecord<BlogPost>(response);
}

export async function getCourses() {
  const response = await publicGet<unknown>("/courses");
  return normalizeArray<Course>(response);
}

export async function getCourse(id: string) {
  if (!id || id === "undefined") return null;
  const response = await publicGet<unknown>(`/courses/${id}`);
  return normalizeRecord<Course>(response);
}

export async function getUserCourses(accessToken: string) {
  const client = createServerApi(accessToken);
  const response = await client.get("/user/courses");
  return normalizeArray<Course>(response.data);
}

export async function getProfile(accessToken: string) {
  const client = createServerApi(accessToken);
  const response = await client.get("/user/profile");
  return normalizeUserProfile(response.data);
}

export async function getTrades(accessToken: string, params?: Record<string, string | number | undefined>) {
  const client = createServerApi(accessToken);
  const response = await client.get("/user/trades", { params });
  const payload = normalizeRecord<PaginatedResponse<Trade>>(response.data);

  return (
    payload ?? {
      items: normalizeArray<Trade>(response.data),
      page: Number(params?.page ?? 1),
      limit: Number(params?.limit ?? 10),
      total: normalizeArray<Trade>(response.data).length,
      totalPages: 1,
    }
  );
}

export async function getAccounts(accessToken: string) {
  const client = createServerApi(accessToken);
  const response = await client.get("/user/iq-account");
  return normalizeArray<IQAccount>(response.data);
}

export async function getAdminStats(accessToken: string) {
  const client = createServerApi(accessToken);
  const response = await client.get("/admin/dashboard/stats");
  return normalizeRecord<DashboardStats>(response.data);
}

export async function getAdminUsers(accessToken: string) {
  const client = createServerApi(accessToken);
  const response = await client.get("/admin/users");
  return normalizeArray<UserProfile>(response.data);
}

export async function getAdminBots(accessToken: string) {
  const client = createServerApi(accessToken);
  const response = await client.get("/admin/bots");
  return normalizeArray<Bot>(response.data);
}

export async function getAdminReviews(accessToken: string) {
  const client = createServerApi(accessToken);
  const response = await client.get("/admin/reviews");
  return normalizeArray<Review>(response.data);
}

export async function getUserPayments(accessToken: string, page = 1) {
  const client = createServerApi(accessToken);
  const response = await client.get("/user/payments", { params: { page, limit: 20 } });
  return response.data as { payments: import("@/types").Payment[]; total: number; page: number; pages: number };
}
