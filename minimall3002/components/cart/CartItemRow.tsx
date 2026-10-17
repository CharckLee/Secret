"use client";

import Link from "next/link";

// 购物车商品行
export function CartItemRow({
  item,
  onUpdate,
  onRemove,
}: {
  item: {
    id: number;
    quantity: number;
    product: {
      id: number;
      name: string;
      price: number;
      imageUrl: string | null;
      stock: number;
    };
  };
  onUpdate: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
}) {
  const subtotal = item.product.price * item.quantity;

  return (
    <div className="flex items-center gap-4 py-4 border-b border-border last:border-b-0">
      {/* 商品图片 */}
      <Link href={`/products/${item.product.id}`} className="shrink-0">
        {item.product.imageUrl ? (
          <img
            src={item.product.imageUrl}
            alt={item.product.name}
            className="w-20 h-20 object-cover rounded-lg"
          />
        ) : (
          <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-text-muted text-xs">
            暂无图片
          </div>
        )}
      </Link>

      {/* 商品信息 */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/products/${item.product.id}`}
          className="text-sm font-medium text-text hover:text-primary line-clamp-1"
        >
          {item.product.name}
        </Link>
        <p className="text-sm text-danger font-medium mt-1">
          ¥{item.product.price.toFixed(2)}
        </p>
      </div>

      {/* 数量控制 */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onUpdate(item.id, item.quantity - 1)}
          disabled={item.quantity <= 1}
          className="w-7 h-7 rounded border border-border text-sm hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          −
        </button>
        <span className="w-10 text-center text-sm">{item.quantity}</span>
        <button
          onClick={() => onUpdate(item.id, item.quantity + 1)}
          disabled={item.quantity >= item.product.stock}
          className="w-7 h-7 rounded border border-border text-sm hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>

      {/* 小计 */}
      <div className="w-20 text-right">
        <span className="text-sm font-medium">¥{subtotal.toFixed(2)}</span>
      </div>

      {/* 删除 */}
      <button
        onClick={() => onRemove(item.id)}
        className="text-text-muted hover:text-danger text-sm shrink-0"
      >
        删除
      </button>
    </div>
  );
}
