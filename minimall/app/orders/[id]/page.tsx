"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getOrderStatusLabel } from "@/lib/utils";

// 订单详情类型
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
  address: string;
  phone: string;
  receiver: string;
  total: number;
  discount: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

// 状态徽章颜色
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

// 订单详情页
export default function OrderDetailPage() {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // 从 URL 中提取订单 ID
  const orderId =
    typeof window !== "undefined"
      ? window.location.pathname.split("/").pop() || ""
      : "";

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setOrder(data.order);
      } else {
        setError(data.error || "加载失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // 模拟支付
  async function handlePay() {
    setPaying(true);
    setError("");

    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "PUT" });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("支付成功！");
        loadOrder(); // 刷新订单状态
      } else {
        setError(data.error || "支付失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setPaying(false);
    }
  }

  // 计算商品合计
  const subtotal =
    order?.items.reduce((s, i) => s + i.price * i.quantity, 0) ?? 0;

  return (
    <div className="min-h-screen bg-bg">
      {/* 顶部导航 */}
      <header className="bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/orders" className="text-text-muted hover:text-text text-sm">
            &larr; 返回订单列表
          </Link>
          <Link href="/" className="text-xl font-bold text-primary">
            Mini Mall
          </Link>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
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

        {loading ? (
          <div className="text-center py-20 text-text-muted">加载中...</div>
        ) : !order ? (
          <div className="text-center py-20">
            <p className="text-text-muted text-lg">订单不存在</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* 左侧：订单详情 */}
            <div className="md:col-span-3 space-y-6">
              {/* 订单状态 */}
              <div className="bg-surface rounded-xl border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-muted mb-1">
                      订单号：{String(order.id).padStart(8, "0")}
                    </p>
                    <p className="text-xs text-text-muted">
                      下单时间：
                      {new Date(order.createdAt).toLocaleString("zh-CN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusStyle(
                      order.status
                    )}`}
                  >
                    {getOrderStatusLabel(order.status)}
                  </span>
                </div>

                {/* 模拟支付按钮 */}
                {order.status === "PENDING" && (
                  <button
                    onClick={handlePay}
                    disabled={paying}
                    className="mt-4 w-full bg-danger text-white py-2.5 rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {paying ? "支付中..." : "去支付"}
                  </button>
                )}

                {/* 支付成功后的状态提示 */}
                {order.status === "PAID" && (
                  <p className="mt-4 text-sm text-text-muted">
                    等待商家发货，请耐心等候
                  </p>
                )}
                {order.status === "SHIPPED" && (
                  <p className="mt-4 text-sm text-text-muted">
                    商品已发货，请注意查收
                  </p>
                )}
                {order.status === "COMPLETED" && (
                  <p className="mt-4 text-sm text-success font-medium">
                    订单已完成
                  </p>
                )}
                {order.status === "CANCELLED" && (
                  <p className="mt-4 text-sm text-text-muted">
                    订单已取消
                  </p>
                )}
              </div>

              {/* 收货信息 */}
              <div className="bg-surface rounded-xl border border-border p-6">
                <h2 className="text-lg font-medium text-text mb-3">收货信息</h2>
                <div className="space-y-1 text-sm text-text-muted">
                  <p>
                    收货人：<span className="text-text">{order.receiver}</span>
                  </p>
                  <p>
                    电话：<span className="text-text">{order.phone}</span>
                  </p>
                  <p>
                    地址：<span className="text-text">{order.address}</span>
                  </p>
                </div>
              </div>

              {/* 商品明细 */}
              <div className="bg-surface rounded-xl border border-border p-6">
                <h2 className="text-lg font-medium text-text mb-4">商品明细</h2>
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 py-2 border-b border-border last:border-b-0"
                    >
                      <Link
                        href={`/products/${item.product.id}`}
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
                      </Link>
                      <Link
                        href={`/products/${item.product.id}`}
                        className="flex-1 text-sm text-text hover:text-primary truncate"
                      >
                        {item.product.name}
                      </Link>
                      <span className="text-sm text-text-muted">
                        ×{item.quantity}
                      </span>
                      <span className="text-sm font-medium">
                        ¥{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 右侧：金额汇总 */}
            <div className="md:col-span-2">
              <div className="bg-surface rounded-xl border border-border p-6 sticky top-20">
                <h2 className="text-lg font-medium text-text mb-4">金额明细</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">商品合计</span>
                    <span>¥{subtotal.toFixed(2)}</span>
                  </div>

                  {order.discount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>会员折扣</span>
                      <span>-¥{order.discount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="pt-3 mt-3 border-t border-border flex justify-between text-base">
                    <span className="font-medium">实付金额</span>
                    <span className="text-xl font-bold text-danger">
                      ¥{order.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
