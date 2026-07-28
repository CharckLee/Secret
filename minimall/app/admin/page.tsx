import { prisma } from "@/lib/prisma";

// 后台仪表盘（Server Component）
export default async function AdminDashboard() {
  // 统计数据
  const [productCount, orderCount, userCount, categoryCount] =
    await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.user.count(),
      prisma.category.count(),
    ]);

  // 各状态订单数
  const [pendingOrders, paidOrders, shippedOrders] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.count({ where: { status: "SHIPPED" } }),
  ]);

  const stats = [
    { label: "商品总数", value: productCount, href: "/admin/products" },
    { label: "订单总数", value: orderCount, href: "/admin/orders" },
    { label: "用户总数", value: userCount, href: "#" },
    { label: "分类总数", value: categoryCount, href: "/admin/categories" },
  ];

  const orderStats = [
    { label: "待付款", value: pendingOrders, color: "bg-amber-50 text-amber-600" },
    { label: "已支付", value: paidOrders, color: "bg-blue-50 text-blue-600" },
    { label: "已发货", value: shippedOrders, color: "bg-purple-50 text-purple-600" },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-text mb-6">仪表盘</h1>

      {/* 核心统计 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <a
            key={stat.label}
            href={stat.href}
            className="bg-surface rounded-xl border border-border p-5 hover:border-primary/30 transition-colors"
          >
            <p className="text-sm text-text-muted">{stat.label}</p>
            <p className="text-3xl font-bold text-text mt-2">{stat.value}</p>
          </a>
        ))}
      </div>

      {/* 订单状态分布 */}
      <h2 className="text-lg font-medium text-text mb-4">订单状态分布</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {orderStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface rounded-xl border border-border p-5"
          >
            <p className="text-sm text-text-muted">{stat.label}</p>
            <p className="text-3xl font-bold text-text mt-2">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
