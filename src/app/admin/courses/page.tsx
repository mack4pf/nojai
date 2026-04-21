import dynamic from "next/dynamic";

const AdminCoursesManager = dynamic(
  () => import("@/components/admin/admin-courses-manager").then((m) => m.AdminCoursesManager),
  { ssr: false },
);

export default function AdminCoursesPage() {
  return <AdminCoursesManager />;
}
