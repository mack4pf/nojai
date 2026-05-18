import { AdminMt5Strategies } from "@/components/admin/admin-mt5-strategies";
import { requireSession } from "@/lib/session";

export default async function AdminMt5StrategiesPage() {
  await requireSession("admin");
  return <AdminMt5Strategies />;
}
