import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { RegisterForm } from "@/components/auth/register-form";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { authOptions } from "@/lib/auth";

interface RegisterPageProps {
  searchParams?: {
    plan?: string;
  };
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect(session.user.role === "admin" ? "/admin" : "/dashboard");
  }

  const selectedPlan = searchParams?.plan;

  return (
    <MarketingShell>
      <section className="mx-auto flex max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_440px] lg:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-primary">New account</p>
            <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight">Launch your NOJAI trading workspace</h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Create an account first, then continue into your dashboard to activate the plan you selected.
            </p>
          </div>
          <RegisterForm selectedPlan={selectedPlan} />
        </div>
      </section>
    </MarketingShell>
  );
}