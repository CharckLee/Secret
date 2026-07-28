import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// 加入购物车请求校验
const AddToCartSchema = z.object({
  productId: z.number().int().positive("无效的商品"),
  quantity: z.number().int().min(1, "数量至少为1").max(999, "数量不能超过999"),
});

// GET /api/cart — 获取当前用户的购物车
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const cartItems = await prisma.cartItem.findMany({
    where: { userId: session.userId },
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
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

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

    // 查找购物车中是否已有该商品
    const existing = await prisma.cartItem.findFirst({
      where: { userId: session.userId, productId },
    });

    const newQuantity = existing ? existing.quantity + quantity : quantity;

    // 检查库存
    if (newQuantity > product.stock) {
      return NextResponse.json(
        { error: `库存不足，当前库存 ${product.stock} 件` },
        { status: 400 }
      );
    }

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQuantity },
      });
    } else {
      await prisma.cartItem.create({
        data: { userId: session.userId, productId, quantity },
      });
    }

    return NextResponse.json({ message: "已加入购物车" }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "操作失败，请稍后重试" },
      { status: 500 }
    );
  }
}
