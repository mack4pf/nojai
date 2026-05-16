import { requireSession } from "@/lib/session";
import { AdminMt5Dashboard } from "@/components/admin/admin-mt5-dashboard";

export default async function AdminMt5Page() {
  await requireSession("admin");
  return <AdminMt5Dashboard />;
}
