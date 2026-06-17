export type UserRole = "user" | "admin";
export type PlanTier = "NONE" | "STANDARD" | "PRO" | "VIP";

export interface PricingPlan {
  _id: string;
  name: string;
  slug: string;
  tier: PlanTier;
  price: number;
  currency: string;
  durationInDays: number;
  features: string[];
  isPopular?: boolean;
  planKey?: string;
  compareAtPrice?: number;
}

export interface Review {
  _id: string;
  rating: number;
  comment: string;
  approved?: boolean;
  createdAt: string;
  user?: {
    _id: string;
    name: string;
  };
  userName:string;
}

export interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  featuredVideo?: string;
  mediaGallery?: Array<{
    kind: "image" | "video";
    url: string;
    fileId?: string;
    name?: string;
  }>;
  createdAt: string;
  publishedAt?: string;
  author?: string;
  tags?: string[];
  published?: boolean;
}

export interface CourseAsset {
  name: string;
  url: string;
  type: "video" | "pdf" | "document" | "image" | "audio" | "archive" | "other";
  fileId?: string;
  mimeType?: string;
  size?: number;
  thumbnailUrl?: string;
  folder?: string;
}

export interface CourseVideo {
  title: string;
  youtubeId: string;
}

export interface Course {
  _id: string;
  title: string;
  slug?: string;
  description?: string;
  coverImage?: string;
  level?: string;
  videoUrl?: string;
  content?: string;
  order?: number;
  accessType?: "free" | "paid";
  price?: number;
  currency?: "NGN" | "USD";
  assets?: CourseAsset[];
  published?: boolean;
  hasAccess?: boolean;
  videos?: CourseVideo[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Trade {
  _id: string;
  accountName: string;
  asset: string;
  direction: "CALL" | "PUT";
  amount: number;
  result: "WIN" | "LOSS" | "PENDING";
  pnl: number;
  createdAt: string;
  broker?: "iq" | "eo" | "olymp" | "mt5";
}

export interface OlympAccount {
  accountId: number;
  email?: string;
  name: string;
  baseAmount: number;
  accountGroup: "real" | "demo";
  balance?: number;
  currency?: string;
  lastConnected?: string;
  status: "connected" | "disconnected";
}

export interface EOAccount {
  accountId: number;
  name: string;
  baseAmount: number;
  isDemo: boolean;
  isMain: boolean;
  copyTradingEnabled: boolean;
  copyFromAccountId: number | null;
  balance?: number;
  currency?: string;
  lastConnected?: string;
  status: "connected" | "disconnected";
  demoBalance?: number;
  realBalance?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IQAccount {
  _id?: string;
  botId?: string;
  label: string;
  login: string;
  email?: string;
  password?: string;
  balance?: number;
  mode: "PRACTICE" | "REAL";
  tradeAmount?: number;
  martingaleEnabled?: boolean;
  currency?: string;
  lastConnected?: string;
}

export interface Subscription {
  plan: PlanTier;
  product?: "binary" | "forex" | "all" | null;
  access?: {
    binary?: boolean;
    forex?: boolean;
  };
  expiresAt?: string;
  active: boolean;
  status?: string;
  startedAt?: string;
  createdAt?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
}

export interface UserProfile {
  _id: string;
  name: string;
  fullName?: string;
  email: string;
  role: UserRole;
  plan: PlanTier;
  martingaleSteps?: number;
  copyTradingEnabled?: boolean;
  webhookCode?: string;
  subscription?: Subscription;
  iqAccounts?: IQAccount[];
  eoAccounts?: EOAccount[];
  olympAccounts?: OlympAccount[];
  olympTradeFreeAccess?: boolean;
  olympTradeFreeAccessApprovedAt?: string | null;
  subscriptionId?: string;
  subscriptionExpiresAt?: string;
  subscriptionStartedAt?: string;
  createdAt?: string;
  joinedAt?: string;
  mt5LoginLock?: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  revenue: number;
  recentTrades: Trade[];
}

export interface Bot {
  _id?: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface Payment {
  _id: string;
  type: "subscription" | "course";
  label: string;
  plan: "standard" | "pro" | "vip" | null;
  status: "active" | "pending" | "expired" | "cancelled" | "free";
  amount: number;
  currency: "NGN" | "USD";
  paymentMethod: "paystack" | "nowpayments" | "manual";
  paymentReference?: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
}

export interface AccessCode {
  _id?: string;
  code: string;
  plan: string;
  durationDays?: number;
  expiresAt: string;
  active?: boolean;
  usedAt?: string;
  usedBy?: { _id: string; email: string } | string;
  createdBy?: { _id: string; email: string } | string;
  botId?: { _id: string; name: string; slug: string } | string;
  isGlobal?: boolean;
  maxUses?: number;
  usedCount?: number;
}

export interface BalanceSnapshot {
  date: string;       // ISO date string e.g. "2026-04-12"
  pnl: number;        // profit/loss for that day
  cumPnl: number;     // cumulative P&L from start of period
  winRate: number;    // 0-100%
}

export interface OnboardingSurvey {
  referralSource: string;  // "telegram" | "youtube" | "google" | "tiktok" | "ai" | "other"
  hasIQAccount: boolean;
  tradingLevel: string;    // "beginner" | "intermediate" | "expert"
  botUsage: string;        // "full_auto" | "alongside" | "other"
  completedAt: string;
}
