import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// 修改数量请求校验
const UpdateQuantitySchema = z.object({
  quantity: z.number().int().min(1, "数量至少为1").max(999, "数量不能超过999"),
});

// PUT /api/cart/[id] — 修改购物车项数量
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const cartItemId = parseInt(id, 10);
  if (isNaN(cartItemId)) {
    return NextResponse.json({ error: "无效的参数" }, { status: 400 });
  }

  // 验证购物车项属于当前用户
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { product: true },
  });

  if (!cartItem || cartItem.userId !== session.userId) {
    return NextResponse.json({ error: "购物车项不存在" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = UpdateQuantitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { quantity } = parsed.data;

    // 检查库存
    if (quantity > cartItem.product.stock) {
      return NextResponse.json(
        { error: `库存不足，当前库存 ${cartItem.product.stock} 件` },
        { status: 400 }
      );
    }

    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });

    return NextResponse.json({ message: "已更新" });
  } catch {
    return NextResponse.json(
      { error: "操作失败，请稍后重试" },
      { status: 500 }
    );
  }
}

// DELETE /api/cart/[id] — 删除购物车项
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const cartItemId = parseInt(id, 10);
  if (isNaN(cartItemId)) {
    return NextResponse.json({ error: "无效的参数" }, { status: 400 });
  }

  // 验证购物车项属于当前用户
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
  });

  if (!cartItem || cartItem.userId !== session.userId) {
    return NextResponse.json({ error: "购物车项不存在" }, { status: 404 });
  }

  await prisma.cartItem.delete({ where: { id: cartItemId } });

  return NextResponse.json({ message: "已删除" });
}
