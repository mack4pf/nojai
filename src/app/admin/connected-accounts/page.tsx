import { requireSession } from "@/lib/session";
import { AdminConnectedAccounts } from "@/components/admin/admin-connected-accounts";

export default async function AdminConnectedAccountsPage() {
  await requireSession("admin");
  return <AdminConnectedAccounts />;
}
