import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getProfile } from "@/lib/api";

export async function requireSession(role?: "user" | "admin") {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  if (role && session.user.role !== role) {
    redirect(session.user.role === "admin" ? "/admin" : "/dashboard");
  }

  return session;
}

export async function requireActiveSubscription() {
  const session = await requireSession("user");

  if (!session.accessToken) {
    redirect("/auth/login");
  }

  const profile = await getProfile(session.accessToken).catch(() => null);

  if (!profile?.subscription?.active) {
    redirect("/dashboard/subscription?required=1");
  }

  return { session, profile };
}