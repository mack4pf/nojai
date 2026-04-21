import { Suspense } from "react";
import { CheckEmailClient } from "@/components/auth/check-email-client";

export const metadata = {
  title: "Check Your Email",
};

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailClient />
    </Suspense>
  );
}
