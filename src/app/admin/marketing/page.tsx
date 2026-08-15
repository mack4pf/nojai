import { AdminMarketing } from "@/components/admin/admin-marketing";
import { requireSession } from "@/lib/session";

export default async function AdminMarketingPage() {
  await requireSession("admin");
  return <AdminMarketing />;
}
