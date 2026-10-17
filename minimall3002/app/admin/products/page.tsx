"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// 类型定义
interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  categoryId: number;
  category: { id: number; name: string };
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// 空表单数据
const emptyForm = {
  name: "",
  description: "",
  price: "" as string | number,
  imageUrl: "",
  stock: "" as string | number,
  categoryId: "" as string | number,
};

/** 生成页码数组，超过7页时显示省略号 */
function generatePageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];

  // 始终显示第 1 页
  pages.push(1);

  if (current > 3) {
    pages.push("...");
  }

  // 当前页前后各 1 页
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  // 始终显示最后一页
  pages.push(total);

  return pages;
}

// 商品管理页
export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // 筛选
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);

  // 表单状态
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // 删除确认
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // 加载商品列表
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      params.set("page", String(page));

      const res = await fetch(`/api/admin/products?${params}`);
      const data = await res.json();
      if (res.ok) {
        setProducts(data.products);
        setPagination(data.pagination);
      } else {
        setError(data.error || "加载失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, page]);

  // 加载分类列表
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) setCategories(await res.json());
    } catch {
      // 忽略分类加载失败
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  // 打开新增表单
  function handleNew() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setError("");
  }

  // 打开编辑表单
  function handleEdit(product: Product) {
    setForm({
      name: product.name,
      description: "", // 需要从详情获取
      price: product.price,
      imageUrl: product.imageUrl || "",
      stock: product.stock,
      categoryId: product.categoryId,
    });
    setEditingId(product.id);
    setShowForm(true);
    setError("");

    // 获取完整商品信息（含 description）
    fetch(`/api/admin/products/${product.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.product) {
          setForm((prev) => ({
            ...prev,
            description: data.product.description,
          }));
        }
      });
  }

  // 取消表单
  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  // 提交表单
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const body = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      imageUrl: form.imageUrl || "",
      stock: Number(form.stock),
      categoryId: Number(form.categoryId),
    };

    try {
      const url = editingId
        ? `/api/admin/products/${editingId}`
        : "/api/admin/products";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(editingId ? "商品已更新" : "商品已创建");
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        loadProducts();
        setTimeout(() => setSuccessMsg(""), 2000);
      } else {
        setError(data.error || "操作失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  // 删除商品
  async function handleDelete(id: number) {
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("已删除");
        loadProducts();
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
        <h1 className="text-2xl font-bold text-text">商品管理</h1>
        {!showForm && (
          <button
            onClick={handleNew}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            + 新增商品
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

      {/* 新增/编辑表单 */}
      {showForm && (
        <div className="bg-surface rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-medium text-text mb-4">
            {editingId ? "编辑商品" : "新增商品"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text mb-1">
                  名称 <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  maxLength={100}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-text mb-1">
                  分类 <span className="text-danger">*</span>
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm({ ...form, categoryId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                >
                  <option value="">请选择分类</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-text mb-1">
                  价格 <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-text mb-1">
                  库存 <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-text mb-1">
                  图片 URL
                </label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) =>
                    setForm({ ...form, imageUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-text mb-1">
                描述 <span className="text-danger">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                maxLength={2000}
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {submitting ? "保存中..." : "保存"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 rounded-lg border border-border text-sm text-text-muted hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 筛选栏 */}
      {!showForm && (
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="搜索商品名称..."
            className="flex-1 max-w-xs px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">全部分类</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 商品表格 */}
      {!showForm && (
        <>
          {loading ? (
            <div className="text-center py-16 text-text-muted">加载中...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-text-muted">暂无商品</div>
          ) : (
            <>
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50">
                      <th className="text-left px-4 py-3 text-text-muted font-medium">
                        ID
                      </th>
                      <th className="text-left px-4 py-3 text-text-muted font-medium">
                        名称
                      </th>
                      <th className="text-right px-4 py-3 text-text-muted font-medium">
                        价格
                      </th>
                      <th className="text-right px-4 py-3 text-text-muted font-medium">
                        库存
                      </th>
                      <th className="text-left px-4 py-3 text-text-muted font-medium">
                        分类
                      </th>
                      <th className="text-left px-4 py-3 text-text-muted font-medium">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b border-border last:border-b-0 hover:bg-gray-50/50"
                      >
                        <td className="px-4 py-3 text-text-muted">
                          {product.id}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {product.imageUrl && (
                              <img
                                src={product.imageUrl}
                                alt=""
                                className="w-8 h-8 rounded object-cover"
                              />
                            )}
                            <span className="text-text font-medium">
                              {product.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-danger font-medium">
                          ¥{product.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {product.stock > 0 ? (
                            product.stock
                          ) : (
                            <span className="text-danger">售罄</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-muted">
                          {product.category.name}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(product)}
                              className="text-primary hover:underline text-xs"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              disabled={deletingId === product.id}
                              className="text-danger hover:underline text-xs disabled:opacity-50"
                            >
                              {deletingId === product.id ? "删除中..." : "删除"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 mt-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 border border-border rounded text-sm hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>

                  {generatePageNumbers(pagination.page, pagination.totalPages).map(
                    (p, i) =>
                      p === "..." ? (
                        <span
                          key={`dots-${i}`}
                          className="px-2 py-1.5 text-sm text-text-muted"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p as number)}
                          className={`w-9 h-9 rounded text-sm font-medium transition-colors ${
                            p === pagination.page
                              ? "bg-primary text-white"
                              : "border border-border hover:bg-gray-50"
                          }`}
                        >
                          {p}
                        </button>
                      )
                  )}

                  <button
                    onClick={() =>
                      setPage((p) => Math.min(pagination.totalPages, p + 1))
                    }
                    disabled={page >= pagination.totalPages}
                    className="px-3 py-1.5 border border-border rounded text-sm hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>

                  <span className="text-xs text-text-muted ml-3">
                    共 {pagination.total} 条
                  </span>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
