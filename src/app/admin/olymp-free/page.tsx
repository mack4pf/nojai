import { requireSession } from "@/lib/session";
import { OlympFreeClient } from "./olymp-free-client";

export default async function AdminOlympFreePage() {
  await requireSession("admin");
  return <OlympFreeClient />;
}
