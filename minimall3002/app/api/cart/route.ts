import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// 加入购物车请求校验
const AddToCartSchema = z.object({
  productId: z.number().int().positive("无效的商品"),
  quantity: z.number().int().min(1, "数量至少为1").max(999, "数量不能超过999"),
});

// GET /api/cart — 获取当前用户的购物车
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          imageUrl: true,
          stock: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  const total = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return NextResponse.json({ items: cartItems, total });
}

// POST /api/cart — 加入购物车
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const body = await request.json();
    const parsed = AddToCartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { productId, quantity } = parsed.data;

    // 检查商品是否存在
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return NextResponse.json({ error: "商品不存在" }, { status: 404 });
    }

    // 在事务中原子完成库存检查 + 写入，防止并发超卖
    try {
      await prisma.$transaction(async (tx) => {
        // 重新读取商品库存（事务内获取最新值）
        const freshProduct = await tx.product.findUnique({
          where: { id: productId },
          select: { stock: true },
        });
        if (!freshProduct) {
          throw new Error("商品不存在");
        }

        // 查找购物车中是否已有该商品
        const existing = await tx.cartItem.findFirst({
          where: { userId, productId },
        });

        const newQuantity = existing ? existing.quantity + quantity : quantity;

        // 检查库存
        if (newQuantity > freshProduct.stock) {
          throw new Error("库存不足");
        }

        if (existing) {
          await tx.cartItem.update({
            where: { id: existing.id },
            data: { quantity: newQuantity },
          });
        } else {
          await tx.cartItem.create({
            data: { userId, productId, quantity },
          });
        }
      });
    } catch (e) {
      if (e instanceof Error && e.message === "库存不足") {
        return NextResponse.json(
          { error: "库存不足" },
          { status: 400 }
        );
      }
      throw e;
    }

    return NextResponse.json({ message: "已加入购物车" }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "操作失败，请稍后重试" },
      { status: 500 }
    );
  }
}
