import { MarketingShell } from "@/components/layout/marketing-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = { title: "Reset Password — NOJAI" };

export default function ForgotPasswordPage() {
  return (
    <MarketingShell>
      <section className="mx-auto flex max-w-7xl flex-col items-center px-6 py-24 lg:px-8">
        <ForgotPasswordForm />
      </section>
    </MarketingShell>
  );
}
