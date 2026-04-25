import { Metadata } from "next";

import { AdminAnalytics } from "@/components/admin/admin-analytics";

export const metadata: Metadata = {
  title: "Analytics — Admin",
};

export default function AdminAnalyticsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <AdminAnalytics />
    </div>
  );
}
