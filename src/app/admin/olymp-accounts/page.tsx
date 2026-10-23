import { requireSession } from "@/lib/session";
import { OlympAccountsClient } from "./olymp-accounts-client";

export default async function AdminOlympAccountsPage() {
  await requireSession("admin");
  return <OlympAccountsClient />;
}
