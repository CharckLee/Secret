"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 加入购物车按钮（Client Component）
export function AddToCartButton({
  productId,
  stock,
}: {
  productId: number;
  stock: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(1);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  async function handleAddToCart() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: count }),
      });

      const data = await res.json();

      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }

      if (res.ok) {
        setMessage("已加入购物车");
        setMessageType("success");
      } else {
        setMessage(data.error || "操作失败");
        setMessageType("error");
      }
    } catch {
      setMessage("网络错误");
      setMessageType("error");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 2000);
    }
  }

  return (
    <div className="space-y-3">
      {/* 数量选择 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-muted">数量：</span>
        <button
          onClick={() => setCount((c) => Math.max(1, c - 1))}
          disabled={count <= 1}
          className="w-8 h-8 rounded border border-border text-sm hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          −
        </button>
        <span className="w-10 text-center text-sm font-medium">{count}</span>
        <button
          onClick={() => setCount((c) => Math.min(stock, c + 1))}
          disabled={count >= stock}
          className="w-8 h-8 rounded border border-border text-sm hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          +
        </button>
        <span className="text-xs text-text-muted">库存 {stock} 件</span>
      </div>

      {/* 按钮 + 提示 */}
      <div className="flex gap-3 items-center">
        <button
          onClick={handleAddToCart}
          disabled={loading || stock <= 0}
          className="flex-1 bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "添加中..." : "加入购物车"}
        </button>
        <button className="px-6 py-3 rounded-lg border border-border font-medium hover:bg-gray-50 transition-colors">
          立即购买
        </button>
      </div>

      {/* 操作反馈 */}
      {message && (
        <p
          className={`text-sm ${
            messageType === "success" ? "text-success" : "text-danger"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
