import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

// 商品详情页（Server Component）
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) notFound();

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true },
  });

  if (!product) notFound();

  return (
    <div className="min-h-screen bg-bg">
      {/* 顶部导航 */}
      <header className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-text-muted hover:text-text text-sm">
              &larr; 返回首页
            </Link>
          </div>
          <Link href="/" className="text-xl font-bold text-primary">
            Mini Mall
          </Link>
          <div className="w-20" /> {/* 占位保持居中 */}
        </div>
      </header>

      {/* 面包屑 */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <nav className="text-sm text-text-muted">
          <Link href="/" className="hover:text-text">
            首页
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/?category=${product.category.slug}`}
            className="hover:text-text"
          >
            {product.category.name}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-text">{product.name}</span>
        </nav>
      </div>

      {/* 商品详情 */}
      <main className="max-w-7xl mx-auto px-4 pb-16">
        <div className="bg-surface rounded-2xl border border-border overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* 左侧：商品图片 */}
            <div className="aspect-square bg-gray-50 flex items-center justify-center">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-text-muted text-lg">暂无图片</span>
              )}
            </div>

            {/* 右侧：商品信息 */}
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <span className="text-xs text-text-muted bg-gray-100 px-3 py-1 rounded-full w-fit">
                {product.category.name}
              </span>

              <h1 className="mt-4 text-2xl font-bold text-text">
                {product.name}
              </h1>

              {/* 价格 */}
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-danger">
                  ¥{product.price.toFixed(2)}
                </span>
              </div>

              {/* 库存 */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-text-muted">库存：</span>
                {product.stock > 0 ? (
                  <span className="text-sm text-success font-medium">
                    有货（剩余 {product.stock} 件）
                  </span>
                ) : (
                  <span className="text-sm text-danger font-medium">
                    暂时售罄
                  </span>
                )}
              </div>

              {/* 描述 */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-text">商品描述</h3>
                <p className="mt-2 text-sm text-text-muted leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* 操作按钮 */}
              <div className="mt-8">
                <AddToCartButton productId={product.id} stock={product.stock} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
