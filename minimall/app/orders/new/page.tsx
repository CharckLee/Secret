"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMembershipDiscountRate, getMembershipLabel } from "@/lib/utils";

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

// 结算页 — 填写收货信息 + 确认订单
export default function NewOrderPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{
    name: string;
    membershipLevel: string;
    totalSpent: number;
  } | null>(null);

  // 表单
  const [receiver, setReceiver] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // 加载购物车和用户信息
  useEffect(() => {
    async function load() {
      try {
        const [cartRes, userRes] = await Promise.all([
          fetch("/api/cart"),
          fetch("/api/auth/me"),
        ]);

        if (cartRes.status === 401 || userRes.status === 401) {
          router.push("/auth/login");
          return;
        }

        const cartData = await cartRes.json();
        const userData = await userRes.json();

        if (cartRes.ok) {
          setItems(cartData.items);
          if (cartData.items.length === 0) {
            router.push("/cart");
            return;
          }
        } else {
          setError(cartData.error || "加载购物车失败");
          return;
        }

        if (userRes.ok) {
          setUser(userData.user || userData);
        }
      } catch {
        setError("网络错误");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  // 提交订单
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!receiver.trim() || !phone.trim() || !address.trim()) {
      setError("请填写完整的收货信息");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiver: receiver.trim(),
          phone: phone.trim(),
          address: address.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(`/orders/${data.orderId}`);
      } else {
        setError(data.error || "下单失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  // 计算金额
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const discountRate = user ? getMembershipDiscountRate(user.membershipLevel) : 0;
  const discount = Math.round(subtotal * discountRate * 100) / 100;
  const total = Math.round((subtotal - discount) * 100) / 100;

  return (
    <div className="min-h-screen bg-bg">
      {/* 顶部导航 */}
      <header className="bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/cart" className="text-text-muted hover:text-text text-sm">
            &larr; 返回购物车
          </Link>
          <Link href="/" className="text-xl font-bold text-primary">
            Mini Mall
          </Link>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-text mb-6">确认订单</h1>

        {error && (
          <div className="mb-4 bg-red-50 text-danger text-sm px-4 py-2.5 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-text-muted">加载中...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* 左侧：收货信息 */}
            <div className="md:col-span-3 space-y-6">
              <div className="bg-surface rounded-xl border border-border p-6">
                <h2 className="text-lg font-medium text-text mb-4">收货信息</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm text-text mb-1">
                      收货人 <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={receiver}
                      onChange={(e) => setReceiver(e.target.value)}
                      placeholder="请输入收货人姓名"
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text mb-1">
                      联系电话 <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="请输入联系电话"
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text mb-1">
                      收货地址 <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="请输入详细收货地址"
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      maxLength={200}
                    />
                  </div>
                </form>
              </div>

              {/* 商品明细 */}
              <div className="bg-surface rounded-xl border border-border p-6">
                <h2 className="text-lg font-medium text-text mb-4">商品明细</h2>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 py-2 border-b border-border last:border-b-0"
                    >
                      <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0">
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
                      <span className="flex-1 text-sm text-text truncate">
                        {item.product.name}
                      </span>
                      <span className="text-sm text-text-muted">
                        ×{item.quantity}
                      </span>
                      <span className="text-sm font-medium">
                        ¥{(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 右侧：金额汇总 */}
            <div className="md:col-span-2">
              <div className="bg-surface rounded-xl border border-border p-6 sticky top-20">
                <h2 className="text-lg font-medium text-text mb-4">金额汇总</h2>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">商品合计</span>
                    <span>¥{subtotal.toFixed(2)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>
                        会员折扣
                        {user && (
                          <span className="ml-1 text-xs text-member-gold">
                            ({getMembershipLabel(user.membershipLevel)})
                          </span>
                        )}
                      </span>
                      <span>-¥{discount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="pt-3 mt-3 border-t border-border flex justify-between text-base">
                    <span className="font-medium">实付金额</span>
                    <span className="text-lg font-bold text-danger">
                      ¥{total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="mt-6 w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "提交中..." : "提交订单"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
