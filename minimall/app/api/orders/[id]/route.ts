import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateMembershipLevel } from "@/lib/utils";

// GET /api/orders/[id] — 订单详情
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: "无效的参数" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!order || order.userId !== session.userId) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  return NextResponse.json({ order });
}

// PUT /api/orders/[id] — 模拟支付（PENDING → PAID）
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: "无效的参数" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order || order.userId !== session.userId) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  if (order.status !== "PENDING") {
    return NextResponse.json(
      { error: "当前订单状态不允许支付" },
      { status: 400 }
    );
  }

  // 模拟支付：更新订单状态 + 更新用户累计消费 + 重算会员等级
  try {
    await prisma.$transaction(async (tx) => {
      // 1. 更新订单状态
      await tx.order.update({
        where: { id: orderId },
        data: { status: "PAID" },
      });

      // 2. 更新用户累计消费
      const user = await tx.user.update({
        where: { id: session.userId },
        data: {
          totalSpent: { increment: order.total },
        },
      });

      // 3. 根据新的累计消费重算会员等级
      const newLevel = calculateMembershipLevel(user.totalSpent);
      if (newLevel !== user.membershipLevel) {
        await tx.user.update({
          where: { id: session.userId },
          data: { membershipLevel: newLevel },
        });
      }
    });

    return NextResponse.json({ message: "支付成功" });
  } catch {
    return NextResponse.json(
      { error: "支付失败，请稍后重试" },
      { status: 500 }
    );
  }
}
