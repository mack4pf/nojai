import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: DefaultSession["user"] & {
      id?: string;
      role?: "user" | "admin";
      plan?: "NONE" | "STANDARD" | "PRO" | "VIP";
      expiresAt?: string;
      emailVerified?: boolean;
    };
  }

  interface User {
    accessToken?: string;
    role?: "user" | "admin";
    plan?: "NONE" | "STANDARD" | "PRO" | "VIP";
    expiresAt?: string;
    emailVerified?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    role?: "user" | "admin";
    plan?: "NONE" | "STANDARD" | "PRO" | "VIP";
    expiresAt?: string;
    emailVerified?: boolean;
  }
}

export {};