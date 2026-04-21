import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { LoginForm } from "@/components/auth/login-form";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { authOptions } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect(session.user.role === "admin" ? "/admin" : "/dashboard");
  }

  return (
    <MarketingShell>
      <section className="mx-auto flex max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_440px] lg:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-primary">Operator access</p>
            <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight">Sign in to your NOJAI workspace</h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Access live balances, trade history, subscription controls, content management, and admin operations from one interface.
            </p>
          </div>
          <LoginForm />
        </div>
      </section>
    </MarketingShell>
  );
}