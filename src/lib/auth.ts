import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

type SessionPlan = "NONE" | "STANDARD" | "PRO" | "VIP";

const apiUrl =
  process.env.API_URL
  ?? process.env.BACKEND_API_URL
  ?? process.env.NEXT_PUBLIC_API_URL
  ?? "http://localhost:5000/api";

function normalizePlan(value?: string | null): SessionPlan {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "STANDARD" || normalized === "PRO" || normalized === "VIP") {
    return normalized;
  }
  return "NONE";
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === "production",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Email and password are required");
        }

        const response = await fetch(`${apiUrl}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload) {
          throw new Error(payload?.message ?? "Invalid credentials");
        }

        const token = payload.token ?? payload.accessToken ?? payload.data?.token;
        const user = payload.user ?? payload.data?.user;

        if (!token || !user) {
          throw new Error("Login response is missing token or user data");
        }

        let plan = normalizePlan(user.plan ?? user.subscription?.plan);
        let expiresAt = user.subscription?.expiresAt;
        let displayName = user.name ?? user.fullName ?? user.username;
        // Start from login response — now includes emailVerifiedAt. Fall back to undefined (not false)
        // so a failed profile fetch never incorrectly marks a verified user as unverified.
        let emailVerified: boolean | undefined = user.emailVerifiedAt != null ? true : undefined;

        try {
          const profileResponse = await fetch(`${apiUrl}/user/profile`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (profileResponse.ok) {
            const profile = await profileResponse.json();
            plan = normalizePlan(profile.subscription?.plan ?? profile.plan);
            expiresAt = profile.subscription?.expiresAt ?? profile.subscriptionExpiresAt ?? expiresAt;
            displayName = profile.name ?? profile.fullName ?? displayName;
            // Only override with the definitive value once we have the full profile
            emailVerified = profile.emailVerifiedAt != null ? true : false;
          }
        } catch {
          // Ignore profile enrichment failures — emailVerified stays as derived from login response
        }

        return {
          id: user._id ?? user.id,
          name: displayName,
          email: user.email,
          role: user.role ?? "user",
          plan,
          expiresAt,
          accessToken: token,
          emailVerified,
        };
      },
    }),
    CredentialsProvider({
      id: "admin-credentials",
      name: "Admin Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Email and password are required");
        }

        const response = await fetch(`${apiUrl}/coconutadminlogin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload) {
          throw new Error(payload?.message ?? "Invalid credentials");
        }

        const token = payload.token ?? payload.accessToken;
        const user = payload.user ?? payload.data?.user;

        if (!token || !user || user.role !== "admin") {
          throw new Error("Access denied");
        }

        return {
          id: user._id ?? user.id,
          name: user.fullName ?? user.name ?? user.email,
          email: user.email,
          role: "admin",
          plan: "NONE" as SessionPlan,
          expiresAt: undefined,
          accessToken: token,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.role = user.role;
        token.plan = user.plan;
        token.expiresAt = user.expiresAt;
        token.name = user.name;
        token.email = user.email;
        token.sub = user.id;
        token.emailVerified = user.emailVerified != null ? Boolean(user.emailVerified) : undefined;
      }

      if (trigger === "update" && session?.user) {
        token.name = session.user.name ?? token.name;
        token.email = session.user.email ?? token.email;
        token.role = session.user.role ?? token.role;
        token.plan = session.user.plan ?? token.plan;
        token.expiresAt = session.user.expiresAt ?? token.expiresAt;
        if (session.user.emailVerified !== undefined) {
          token.emailVerified = session.user.emailVerified;
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.id = token.sub;
      session.user.role = token.role;
      session.user.plan = token.plan;
      session.user.expiresAt = token.expiresAt;
      session.user.name = token.name;
      session.user.email = token.email;
      session.user.emailVerified = token.emailVerified;

      return session;
    },
  },
};
