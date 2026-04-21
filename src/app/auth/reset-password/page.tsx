import { MarketingShell } from "@/components/layout/marketing-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import Link from "next/link";

export const metadata = { title: "Set New Password — NOJAI" };

interface ResetPasswordPageProps {
  searchParams: { token?: string; email?: string };
}

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const token = searchParams.token ?? "";
  const email = searchParams.email ?? "";

  if (!token || !email) {
    return (
      <MarketingShell>
        <section className="mx-auto flex max-w-7xl flex-col items-center px-6 py-24 lg:px-8">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center space-y-4">
            <h2 className="font-display text-lg font-semibold">Invalid reset link</h2>
            <p className="text-sm text-muted-foreground">
              This link is missing required information. Please use the link directly from your email.
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-block text-sm text-primary hover:underline"
            >
              Request a new reset link
            </Link>
          </div>
        </section>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <section className="mx-auto flex max-w-7xl flex-col items-center px-6 py-24 lg:px-8">
        <ResetPasswordForm token={token} email={email} />
      </section>
    </MarketingShell>
  );
}
