import { AdminSupportInbox } from "@/components/admin/admin-support-inbox";

export const metadata = { title: "Support — Admin" };

export default function AdminSupportPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Support Inbox</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Read and reply to user support messages, bug reports, and issues.
        </p>
      </div>
      <AdminSupportInbox />
    </div>
  );
}
