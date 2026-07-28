"use client";

import { useEffect, useState, useCallback } from "react";

// 类型定义
interface Category {
  id: number;
  name: string;
  slug: string;
  productCount: number;
}

// 分类管理页
export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // 新增表单
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 删除状态
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      if (res.ok) {
        setCategories(data.categories);
      } else {
        setError(data.error || "加载失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // 自动生成 slug
  function handleNameChange(name: string) {
    setFormName(name);
    // 自动生成 slug：中文转拼音不可用，使用输入框让用户手动填
    if (!formSlug || formSlug === slugify(formName)) {
      setFormSlug(slugify(name));
    }
  }

  // 简单 slug 生成（如果纯英文）
  function slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9一-龥-]/g, "")
      .replace(/[一-龥]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // 创建分类
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), slug: formSlug.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("分类已创建");
        setShowForm(false);
        setFormName("");
        setFormSlug("");
        loadCategories();
        setTimeout(() => setSuccessMsg(""), 2000);
      } else {
        setError(data.error || "创建失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  // 删除分类
  async function handleDelete(id: number) {
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("已删除");
        loadCategories();
        setTimeout(() => setSuccessMsg(""), 2000);
      } else {
        setError(data.error || "删除失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">分类管理</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            + 新增分类
          </button>
        )}
      </div>

      {/* 消息提示 */}
      {error && (
        <div className="mb-4 bg-red-50 text-danger text-sm px-4 py-2.5 rounded-lg">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 bg-green-50 text-success text-sm px-4 py-2.5 rounded-lg">
          {successMsg}
        </div>
      )}

      {/* 新增表单 */}
      {showForm && (
        <div className="bg-surface rounded-xl border border-border p-6 mb-6 max-w-md">
          <h2 className="text-lg font-medium text-text mb-4">新增分类</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm text-text mb-1">
                分类名称 <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                maxLength={50}
                required
                placeholder="例如：电子产品"
              />
            </div>
            <div>
              <label className="block text-sm text-text mb-1">
                标识（slug） <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                maxLength={50}
                required
                placeholder="例如：electronics（小写字母、数字、连字符）"
              />
              <p className="text-xs text-text-muted mt-1">
                用于 URL 路径，如 /?category=electronics
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {submitting ? "创建中..." : "创建"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormName("");
                  setFormSlug("");
                }}
                className="px-6 py-2 rounded-lg border border-border text-sm text-text-muted hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 分类列表 */}
      {loading ? (
        <div className="text-center py-16 text-text-muted">加载中...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-text-muted">暂无分类</div>
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden max-w-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="text-left px-4 py-3 text-text-muted font-medium">
                  名称
                </th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">
                  标识
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">
                  商品数
                </th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr
                  key={cat.id}
                  className="border-b border-border last:border-b-0 hover:bg-gray-50/50"
                >
                  <td className="px-4 py-3 text-text font-medium">{cat.name}</td>
                  <td className="px-4 py-3 text-text-muted font-mono text-xs">
                    {cat.slug}
                  </td>
                  <td className="px-4 py-3 text-right">{cat.productCount}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(cat.id)}
                      disabled={deletingId === cat.id || cat.productCount > 0}
                      className="text-danger hover:underline text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                      title={
                        cat.productCount > 0
                          ? `该分类下有 ${cat.productCount} 个商品，无法删除`
                          : "删除分类"
                      }
                    >
                      {deletingId === cat.id ? "删除中..." : "删除"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
