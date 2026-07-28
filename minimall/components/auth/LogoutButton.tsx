"use client";

import { useRouter } from "next/navigation";

// 退出登录按钮（Client Component）
export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-text-muted hover:text-danger transition-colors"
    >
      退出
    </button>
  );
}
