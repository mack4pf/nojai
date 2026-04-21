import { MarketingShell } from "@/components/layout/marketing-shell";
import { VerifyEmailClient } from "@/components/auth/verify-email-client";

export const metadata = { title: "Verify Email — NOJAI" };

interface VerifyEmailPageProps {
  searchParams: { token?: string; email?: string };
}

export default function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const token = searchParams.token ?? "";
  const email = searchParams.email ?? "";

  return (
    <MarketingShell>
      <section className="mx-auto flex max-w-7xl flex-col items-center px-6 py-24 lg:px-8">
        <VerifyEmailClient token={token} email={email} />
      </section>
    </MarketingShell>
  );
}
