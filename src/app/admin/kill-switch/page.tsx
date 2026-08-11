import { AdminKillSwitch } from "@/components/admin/admin-kill-switch";
import { requireSession } from "@/lib/session";

export default async function AdminKillSwitchPage() {
  await requireSession("admin");
  return <AdminKillSwitch />;
}
