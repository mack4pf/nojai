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

/**
 * For pages that are part of the Forex/MT5 product.
 *
 * An active subscription is not enough: MT5 belongs to VIP, and the
 * autotrade page only checked for a subscription — so a Standard or Pro user
 * could open it by typing the URL, even with the nav entry hidden from them.
 */
export async function requireForexSubscription() {
  const { session, profile } = await requireActiveSubscription();
  if (!profile?.subscription?.access?.forex) {
    redirect("/dashboard/subscription");
  }
  return { session, profile };
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