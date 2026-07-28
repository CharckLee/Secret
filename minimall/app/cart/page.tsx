"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CartItemRow } from "@/components/cart/CartItemRow";

// 购物车项类型
interface CartItem {
  id: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    price: number;
    imageUrl: string | null;
    stock: number;
  };
}

// 购物车页面
export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 加载购物车
  const loadCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setItems(data.items);
      } else {
        setError(data.error || "加载失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // 修改数量
  async function handleUpdate(id: number, quantity: number) {
    if (quantity < 1) {
      handleRemove(id);
      return;
    }

    const res = await fetch(`/api/cart/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });

    const data = await res.json();
    if (res.ok) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, quantity } : item
        )
      );
    } else {
      setError(data.error || "更新失败");
      setTimeout(() => setError(""), 2000);
    }
  }

  // 删除商品
  async function handleRemove(id: number) {
    const res = await fetch(`/api/cart/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      setError("删除失败");
      setTimeout(() => setError(""), 2000);
    }
  }

  // 计算总价
  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-bg">
      {/* 顶部导航 */}
      <header className="bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-text-muted hover:text-text text-sm">
            &larr; 继续购物
          </Link>
          <Link href="/" className="text-xl font-bold text-primary">
            Mini Mall
          </Link>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-text mb-6">购物车</h1>

        {error && (
          <div className="mb-4 bg-red-50 text-danger text-sm px-4 py-2.5 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-text-muted">加载中...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-muted text-lg mb-4">购物车是空的</p>
            <Link
              href="/"
              className="text-primary hover:underline text-sm"
            >
              去逛逛
            </Link>
          </div>
        ) : (
          <>
            {/* 购物车列表 */}
            <div className="bg-surface rounded-xl border border-border p-6">
              {items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                />
              ))}
            </div>

            {/* 底部汇总 */}
            <div className="mt-6 bg-surface rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-text-muted">
                  共 {items.reduce((s, i) => s + i.quantity, 0)} 件商品
                </span>
                <div className="text-right">
                  <span className="text-sm text-text-muted mr-2">合计：</span>
                  <span className="text-xl font-bold text-danger">
                    ¥{total.toFixed(2)}
                  </span>
                </div>
              </div>
              <button
                className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors"
                onClick={() => router.push("/orders/new")}
              >
                提交订单
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
