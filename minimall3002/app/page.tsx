import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMembershipLabel } from "@/lib/utils";
import { SearchBar } from "@/components/product/SearchBar";
import { ProductCard } from "@/components/product/ProductCard";
import { Pagination } from "@/components/ui/Pagination";
import { LogoutButton } from "@/components/auth/LogoutButton";

// 首页 — 商品列表（Server Component）
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const category = params.category || "";
  const page = parseInt(params.page || "1", 10);

  const pageSize = 9;

  // 构建查询条件
  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }
  if (category) {
    where.category = { slug: category };
  }

  // 并行查询：商品列表 + 分类列表 + 总数
  const [products, categories, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.product.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-bg">
      {/* 顶部导航 */}
      <header className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">
            Mini Mall
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {user ? (
              <>
                <Link href="/orders" className="text-text-muted hover:text-text">
                  我的订单
                </Link>
                <Link href="/cart" className="text-text-muted hover:text-text">
                  购物车
                </Link>
                <span className="text-text-muted">|</span>
                <span className="text-text">
                  {user.name}
                  {getMembershipLabel(user.membershipLevel) && (
                    <span className="ml-1 text-xs text-member-gold font-medium">
                      {getMembershipLabel(user.membershipLevel)}
                    </span>
                  )}
                </span>
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="bg-member-gold/10 text-member-gold px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-member-gold/20 transition-colors"
                  >
                    ⚙ 后台
                  </Link>
                )}
                <LogoutButton />
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-text-muted hover:text-text">
                  登录
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
                >
                  注册
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* 搜索栏 */}
      <section className="pt-8 pb-4">
        <SearchBar />
      </section>

      {/* 分类标签 */}
      <section className="max-w-7xl mx-auto px-4 pb-6">
        <div className="flex flex-wrap gap-2 justify-center">
          <Link
            href="/"
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              !category
                ? "bg-primary text-white"
                : "bg-surface border border-border text-text-muted hover:text-text hover:border-primary/30"
            }`}
          >
            全部
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/?category=${cat.slug}`}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                category === cat.slug
                  ? "bg-primary text-white"
                  : "bg-surface border border-border text-text-muted hover:text-text hover:border-primary/30"
              }`}
            >
              {cat.name} ({cat._count.products})
            </Link>
          ))}
        </div>
      </section>

      {/* 商品网格 */}
      <main className="max-w-7xl mx-auto px-4 pb-8">
        {products.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* 分页 */}
            <div className="mt-10">
              <Pagination page={page} totalPages={totalPages} />
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-text-muted text-lg">没有找到相关商品</p>
            {search && (
              <p className="text-text-muted text-sm mt-2">
                搜索关键词：&ldquo;{search}&rdquo;，试试其他关键词
              </p>
            )}
          </div>
        )}
      </main>

      {/* 页脚 */}
      <footer className="bg-surface border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-text-muted">
          &copy; {new Date().getFullYear()} Mini Mall — 微型电商平台
        </div>
      </footer>
    </div>
  );
}
