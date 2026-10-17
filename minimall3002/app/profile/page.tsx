import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getMembershipLabel,
  getMembershipDiscountRate,
  calculateMembershipLevel,
} from "@/lib/utils";
import { LogoutButton } from "@/components/auth/LogoutButton";

// 会员等级配置：阈值、名称、颜色、下一级信息
const MEMBERSHIP_TIERS = [
  { level: "NONE", min: 0, name: "普通用户", color: "text-text-muted", bg: "bg-gray-100", icon: "😊" },
  { level: "LEVEL_1", min: 8000, name: "心悦1级", color: "text-amber-600", bg: "bg-amber-50", icon: "⭐" },
  { level: "LEVEL_2", min: 80000, name: "心悦2级", color: "text-purple-600", bg: "bg-purple-50", icon: "💎" },
  { level: "LEVEL_3", min: 800000, name: "心悦3级", color: "text-pink-600", bg: "bg-pink-50", icon: "👑" },
] as const;

function getTierInfo(level: string) {
  return MEMBERSHIP_TIERS.find((t) => t.level === level) || MEMBERSHIP_TIERS[0];
}

function getNextTier(level: string) {
  const idx = MEMBERSHIP_TIERS.findIndex((t) => t.level === level);
  if (idx === -1 || idx >= MEMBERSHIP_TIERS.length - 1) return null;
  return MEMBERSHIP_TIERS[idx + 1];
}

// 头像色系生成（根据首字符取色）
function avatarColor(name: string): string {
  const colors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-amber-500",
    "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-rose-500",
  ];
  const charCode = name.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
}

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  // 查询订单统计
  const [orderCount, pendingCount, cartCount] = await Promise.all([
    prisma.order.count({ where: { userId: user.id } }),
    prisma.order.count({ where: { userId: user.id, status: "PENDING" } }),
    prisma.cartItem.count({ where: { userId: user.id } }),
  ]);

  const tierInfo = getTierInfo(user.membershipLevel);
  const nextTier = getNextTier(user.membershipLevel);
  const label = getMembershipLabel(user.membershipLevel);
  const discountRate = getMembershipDiscountRate(user.membershipLevel);

  // 进度条计算
  const progressPercent = nextTier
    ? Math.min(100, Math.round(((user.totalSpent - tierInfo.min) / (nextTier.min - tierInfo.min)) * 100))
    : 100;

  const initial = user.name.charAt(0).toUpperCase();

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
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 个人卡片 */}
        <div className="bg-surface rounded-2xl border border-border overflow-hidden mb-6">
          {/* 顶部 Banner */}
          <div className="h-24 bg-gradient-to-r from-primary to-indigo-500 relative">
            <div className="absolute -bottom-10 left-6">
              <div
                className={`w-20 h-20 rounded-full ${avatarColor(user.name)} ring-4 ring-surface flex items-center justify-center text-white text-2xl font-bold shadow-lg`}
              >
                {initial}
              </div>
            </div>
          </div>

          {/* 个人信息区 */}
          <div className="pt-12 px-6 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-text">{user.name}</h1>
                <p className="text-sm text-text-muted mt-0.5">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/orders"
                  className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-gray-50 transition-colors"
                >
                  我的订单
                </Link>
                <Link
                  href="/cart"
                  className="text-sm px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
                >
                  购物车{cartCount > 0 ? ` (${cartCount})` : ""}
                </Link>
              </div>
            </div>

            <p className="text-xs text-text-muted mt-3">
              注册时间：{new Date(user.createdAt).toLocaleDateString("zh-CN")}
            </p>
          </div>
        </div>

        {/* 数据看板 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-surface rounded-xl border border-border p-5 text-center">
            <p className="text-3xl font-bold text-text">{orderCount}</p>
            <p className="text-sm text-text-muted mt-1">全部订单</p>
          </div>
          <div className="bg-surface rounded-xl border border-border p-5 text-center">
            <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-sm text-text-muted mt-1">待付款</p>
          </div>
          <div className="bg-surface rounded-xl border border-border p-5 text-center">
            <p className="text-3xl font-bold text-text">
              ¥{user.totalSpent.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-text-muted mt-1">累计消费</p>
          </div>
        </div>

        {/* 会员卡片 */}
        <div className="bg-surface rounded-2xl border border-border overflow-hidden mb-6">
          <div className={`${tierInfo.bg} px-6 py-5`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{tierInfo.icon}</span>
              <div>
                <p className={`text-lg font-bold ${tierInfo.color}`}>
                  {label || tierInfo.name}
                </p>
                {discountRate > 0 && (
                  <p className="text-sm text-text-muted">
                    享 {(1 - discountRate) * 10} 折优惠
                  </p>
                )}
                {!label && (
                  <p className="text-sm text-text-muted">
                    累计消费满 ¥8,000 即可升级心悦1级
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 升级进度条 */}
          {nextTier && (
            <div className="px-6 py-4 border-t border-border">
              <div className="flex items-center justify-between text-xs text-text-muted mb-2">
                <span>{tierInfo.name}</span>
                <span>
                  距离 {nextTier.name} 还需 ¥
                  {(nextTier.min - user.totalSpent).toLocaleString("zh-CN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-text-muted mt-1.5">
                <span>¥{tierInfo.min.toLocaleString()}</span>
                <span>¥{nextTier.min.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* 已达最高等级 */}
          {!nextTier && user.membershipLevel !== "NONE" && (
            <div className="px-6 py-4 border-t border-border text-center">
              <p className="text-sm text-text-muted">🎉 已达最高会员等级</p>
            </div>
          )}
        </div>

        {/* 快捷操作 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/orders"
            className="bg-surface rounded-xl border border-border p-4 text-center hover:border-primary/30 transition-colors group"
          >
            <p className="text-2xl mb-1">📦</p>
            <p className="text-sm text-text group-hover:text-primary">我的订单</p>
          </Link>
          <Link
            href="/cart"
            className="bg-surface rounded-xl border border-border p-4 text-center hover:border-primary/30 transition-colors group"
          >
            <p className="text-2xl mb-1">🛒</p>
            <p className="text-sm text-text group-hover:text-primary">购物车</p>
          </Link>
          <Link
            href="/auth/login"
            className="bg-surface rounded-xl border border-border p-4 text-center hover:border-primary/30 transition-colors group"
          >
            <p className="text-2xl mb-1">🔑</p>
            <p className="text-sm text-text group-hover:text-primary">切换账号</p>
          </Link>
          <div className="bg-surface rounded-xl border border-border p-4 text-center">
            <LogoutButton />
          </div>
        </div>
      </main>
    </div>
  );
}
