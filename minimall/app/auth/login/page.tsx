"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// 登录页面
export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "登录失败");
        return;
      }

      // 登录成功，跳转首页
      router.push("/");
      router.refresh();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-primary">
            Mini Mall
          </Link>
          <p className="mt-2 text-text-muted text-sm">欢迎回来，请登录</p>
        </div>

        {/* 表单 */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-danger text-sm px-4 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text mb-1.5"
              >
                邮箱
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="请输入邮箱"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text mb-1.5"
              >
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="请输入密码"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "登录中..." : "登录"}
            </button>
          </form>
        </div>

        {/* 底部链接 */}
        <p className="mt-4 text-center text-sm text-text-muted">
          还没有账号？
          <Link
            href="/auth/register"
            className="text-primary hover:underline ml-1"
          >
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
}
