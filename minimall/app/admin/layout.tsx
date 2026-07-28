import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";

// 后台管理布局（Server Component）— 验证 ADMIN 权限 + 顶部标签导航
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* 顶部标签导航 */}
      <AdminNav userName={user.name} />

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
