import { requireSession } from "@/lib/session";
import { AdminAffiliates } from "@/components/admin/admin-affiliates";

export default async function AdminAffiliatesPage() {
  await requireSession("admin");
  return <AdminAffiliates />;
}
