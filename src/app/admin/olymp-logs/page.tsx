import { requireSession } from "@/lib/session";
import { OlympLogsClient } from "./olymp-logs-client";

export const metadata = { title: "Olymp Logs — Admin" };

export default async function AdminOlympLogsPage() {
  await requireSession("admin");
  return <OlympLogsClient />;
}
