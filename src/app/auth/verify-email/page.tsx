import { MarketingShell } from "@/components/layout/marketing-shell";
import { VerifyEmailClient } from "@/components/auth/verify-email-client";

export const metadata = { title: "Verify Email — NOJAI" };

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string; email?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = params.token ?? "";
  const email = params.email ?? "";

  return (
    <MarketingShell>
      <section className="mx-auto flex max-w-7xl flex-col items-center px-6 py-24 lg:px-8">
        <VerifyEmailClient token={token} email={email} />
      </section>
    </MarketingShell>
  );
}
