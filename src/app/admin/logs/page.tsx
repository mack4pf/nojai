import { requireSession } from "@/lib/session";
import { AdminLogs } from "@/components/admin/admin-logs";

export default async function AdminLogsPage() {
  await requireSession("admin");
  return <AdminLogs />;
}
