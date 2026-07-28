"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getOrderStatusLabel } from "@/lib/utils";

// 订单列表项类型
interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  product: {
    id: number;
    name: string;
    imageUrl: string | null;
  };
}

interface Order {
  id: number;
  status: string;
  total: number;
  discount: number;
  createdAt: string;
  items: OrderItem[];
}

// 订单状态徽章颜色
function getStatusStyle(status: string): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-600";
    case "PAID":
      return "bg-blue-50 text-blue-600";
    case "SHIPPED":
      return "bg-purple-50 text-purple-600";
    case "COMPLETED":
      return "bg-green-50 text-green-600";
    case "CANCELLED":
      return "bg-gray-100 text-gray-500";
    default:
      return "bg-gray-100 text-gray-500";
  }
}

// 订单列表页
export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders);
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
    loadOrders();
  }, [loadOrders]);

  return (
    <div className="min-h-screen bg-bg">
      {/* 顶部导航 */}
      <header className="bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-text-muted hover:text-text text-sm">
            &larr; 返回首页
          </Link>
          <Link href="/" className="text-xl font-bold text-primary">
            Mini Mall
          </Link>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-text mb-6">我的订单</h1>

        {error && (
          <div className="mb-4 bg-red-50 text-danger text-sm px-4 py-2.5 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-text-muted">加载中...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-muted text-lg mb-4">暂无订单</p>
            <Link href="/" className="text-primary hover:underline text-sm">
              去逛逛
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-surface rounded-xl border border-border p-6 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-text-muted">
                    订单号：{String(order.id).padStart(8, "0")}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusStyle(
                      order.status
                    )}`}
                  >
                    {getOrderStatusLabel(order.status)}
                  </span>
                </div>

                {/* 商品缩略 */}
                <div className="flex items-center gap-2 mb-3">
                  {order.items.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0"
                    >
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
                          无图
                        </div>
                      )}
                    </div>
                  ))}
                  {order.items.length > 5 && (
                    <span className="text-xs text-text-muted">
                      +{order.items.length - 5}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">
                    共 {order.items.reduce((s, i) => s + i.quantity, 0)} 件商品
                  </span>
                  <div className="text-right">
                    {order.discount > 0 && (
                      <span className="text-xs text-success mr-2">
                        已省 ¥{order.discount.toFixed(2)}
                      </span>
                    )}
                    <span className="text-base font-bold text-danger">
                      ¥{order.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-xs text-text-muted">
                  {new Date(order.createdAt).toLocaleString("zh-CN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
