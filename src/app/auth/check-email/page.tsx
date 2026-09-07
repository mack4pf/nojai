import { redirect } from "next/navigation";

export const metadata = {
  title: "Check Your Email",
};

/**
 * This used to be a page whose only job was to tell the user to go to
 * another page to type their code. The code entry now lives on the
 * verification page itself, so anything still pointing here is sent
 * straight there rather than through the extra hop.
 */
export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  redirect(email ? `/auth/verify-email?email=${encodeURIComponent(email)}` : "/auth/verify-email");
}
