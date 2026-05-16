import { AdminMt5AccountsReview } from "@/components/admin/admin-mt5-dashboard";
import { requireSession } from "@/lib/session";

export default async function AdminMt5AccountsPage() {
  await requireSession("admin");
  return <AdminMt5AccountsReview />;
}
