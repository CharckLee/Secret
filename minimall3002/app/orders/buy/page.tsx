"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getMembershipDiscountRate, getMembershipLabel, roundMoney } from "@/lib/utils";

// 商品类型
interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  stock: number;
}

// 直购结算页（外层 Suspense 包裹）
export default function BuyNowPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <span className="text-text-muted">加载中...</span>
      </div>
    }>
      <BuyNowContent />
    </Suspense>
  );
}

// 直购结算页内容（使用 useSearchParams 需要 Suspense）
function BuyNowContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = parseInt(searchParams.get("productId") || "", 10);
  const quantity = parseInt(searchParams.get("quantity") || "1", 10) || 1;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{
    name: string;
    membershipLevel: string;
  } | null>(null);

  const [receiver, setReceiver] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // 加载商品和用户信息
  useEffect(() => {
    let cancelled = false;

    if (isNaN(productId) || productId <= 0) {
      setError("无效的商品链接");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const [productRes, userRes] = await Promise.all([
          fetch(`/api/products/${productId}`),
          fetch("/api/auth/me"),
        ]);

        if (productRes.status === 404) {
          if (!cancelled) { setError("商品不存在"); setLoading(false); }
          return;
        }

        if (userRes.status === 401) {
          router.push(`/auth/login?redirect=/orders/buy?productId=${productId}&quantity=${quantity}`);
          return;
        }

        const productData = await productRes.json();
        const userData = await userRes.json();

        if (cancelled) return;

        setProduct(productData);
        setUser(userData);

        // 预填收货人
        if (userData?.name) {
          setReceiver(userData.name);
        }
      } catch {
        if (!cancelled) setError("网络错误");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 提交直购订单
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!receiver.trim() || !phone.trim() || !address.trim()) {
      setError("请填写完整的收货信息");
      return;
    }

    if (!product) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/orders/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          quantity,
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

  // 金额计算
  const subtotal = product ? roundMoney(product.price * quantity) : 0;
  const discountRate = user ? getMembershipDiscountRate(user.membershipLevel) : 0;
  const discount = roundMoney(subtotal * discountRate);
  const total = roundMoney(subtotal - discount);

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
        <h1 className="text-2xl font-bold text-text mb-6">确认订单</h1>

        {error && (
          <div className="mb-4 bg-red-50 text-danger text-sm px-4 py-2.5 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-text-muted">加载中...</div>
        ) : !product ? (
          <div className="text-center py-20 text-text-muted">
            {error || "商品不存在"}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {/* 左侧：收货信息 */}
              <div className="md:col-span-3 space-y-6">
                <div className="bg-surface rounded-xl border border-border p-6">
                  <h2 className="text-lg font-medium text-text mb-4">收货信息</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-text mb-1">
                        收货人 <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        value={receiver}
                        onChange={(e) => setReceiver(e.target.value)}
                        placeholder="请输入收货人姓名"
                        required
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
                        required
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
                        required
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        maxLength={200}
                      />
                    </div>
                  </div>
                </div>

                {/* 商品明细 */}
                <div className="bg-surface rounded-xl border border-border p-6">
                  <h2 className="text-lg font-medium text-text mb-4">商品明细</h2>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
                          无图
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        单价 ¥{product.price.toFixed(2)} × {quantity}
                      </p>
                    </div>
                    <span className="text-sm font-medium">
                      ¥{subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 右侧：金额汇总 */}
              <div className="md:col-span-2">
                <div className="bg-surface rounded-xl border border-border p-6 sticky top-20">
                  <h2 className="text-lg font-medium text-text mb-4">金额汇总</h2>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">商品金额</span>
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
                    type="submit"
                    disabled={submitting}
                    className="mt-6 w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "提交中..." : "提交订单"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
