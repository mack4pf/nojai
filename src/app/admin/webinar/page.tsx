import { AdminWebinar } from "@/components/admin/admin-webinar";
import { requireSession } from "@/lib/session";

export default async function AdminWebinarPage() {
  await requireSession("admin");
  return <AdminWebinar />;
}
