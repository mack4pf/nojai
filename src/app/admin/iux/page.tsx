import { AdminIuxManager } from "@/components/admin/admin-iux-manager";
import { requireSession } from "@/lib/session";

export default async function AdminIuxPage() {
  await requireSession("admin");
  return <AdminIuxManager />;
}
