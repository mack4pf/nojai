import { requireSession } from "@/lib/session";
import { OlympPartnerClient } from "./olymp-partner-client";

export default async function AdminOlympPartnerPage() {
  await requireSession("admin");
  return <OlympPartnerClient />;
}
