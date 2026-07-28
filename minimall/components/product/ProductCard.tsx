import Link from "next/link";

// 商品卡片组件（Server Component）
export function ProductCard({
  product,
}: {
  product: {
    id: number;
    name: string;
    price: number;
    imageUrl: string | null;
    stock: number;
    category: { name: string };
  };
}) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group bg-surface rounded-xl border border-border overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-200"
    >
      {/* 商品图片 */}
      <div className="aspect-square bg-gray-50 relative overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted">
            暂无图片
          </div>
        )}
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-sm font-medium bg-black/60 px-3 py-1 rounded-full">
              已售罄
            </span>
          </div>
        )}
      </div>

      {/* 商品信息 */}
      <div className="p-4">
        <span className="text-xs text-text-muted bg-gray-100 px-2 py-0.5 rounded">
          {product.category.name}
        </span>
        <h3 className="mt-2 font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-danger">
            ¥{product.price.toFixed(2)}
          </span>
          <span className="text-xs text-text-muted">
            库存 {product.stock}
          </span>
        </div>
      </div>
    </Link>
  );
}
