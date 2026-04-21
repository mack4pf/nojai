import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { AdminLoginForm } from "@/components/auth/admin-login-form";
import { authOptions } from "@/lib/auth";

// This page is intentionally NOT linked from any navigation.
// Admin accesses it directly by URL.
export const metadata = { robots: "noindex, nofollow" };

export default async function AdminLoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user.role === "admin") redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <AdminLoginForm />
    </div>
  );
}
