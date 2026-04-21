import dynamic from "next/dynamic";

const AdminBlogManager = dynamic(
  () => import("@/components/admin/admin-blog-manager").then((m) => m.AdminBlogManager),
  { ssr: false },
);

export default function AdminBlogPage() {
  return <AdminBlogManager />;
}
