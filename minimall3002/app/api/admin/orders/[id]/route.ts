import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { calculateMembershipLevel, getOrderStatusLabel } from "@/lib/utils";
import { OrderStatusChangedError } from "@/lib/errors";

// 订单状态枚举
const VALID_STATUSES = ["PENDING", "PAID", "SHIPPED", "COMPLETED", "CANCELLED"] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

// 合法的状态流转（key → 可到达的状态）
const ALLOWED_TRANSITIONS: Record<string, OrderStatus[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

// 更新状态请求校验
const UpdateStatusSchema = z.object({
  status: z.enum(VALID_STATUSES, { message: "无效的订单状态" }),
});

// GET /api/admin/orders/[id] — 订单详情
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: "无效的参数" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, imageUrl: true } },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  return NextResponse.json({ order });
}

// PUT /api/admin/orders/[id] — 更新订单状态
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: "无效的参数" }, { status: 400 });
  }

  // 验证订单存在
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });
  if (!order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效的请求数据" }, { status: 400 });
  }

  const parsed = UpdateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const newStatus = parsed.data.status as OrderStatus;
  const currentStatus = order.status;

  // 相同的状态无需更新
  if (newStatus === currentStatus) {
    return NextResponse.json({ error: "订单已经是该状态" }, { status: 400 });
  }

  // 验证状态流转是否合法
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    return NextResponse.json(
      {
        error: `不允许从「${getOrderStatusLabel(currentStatus)}」变更为「${getOrderStatusLabel(newStatus)}」`,
      },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 原子更新：仅当状态仍为预读时的值才更新（防并发）
      const result = await tx.order.updateMany({
        where: { id: orderId, status: currentStatus },
        data: { status: newStatus },
      });
      if (result.count === 0) {
        throw new OrderStatusChangedError();
      }

      // 如果从 PAID 取消，退回累计消费
      if (currentStatus === "PAID" && newStatus === "CANCELLED") {
        const updatedUser = await tx.user.update({
          where: { id: order.userId },
          data: { totalSpent: { decrement: order.total } },
        });
        const newLevel = calculateMembershipLevel(updatedUser.totalSpent);
        if (newLevel !== updatedUser.membershipLevel) {
          await tx.user.update({
            where: { id: order.userId },
            data: { membershipLevel: newLevel },
          });
        }
      }
    });

    return NextResponse.json({ message: "状态已更新" });
  } catch (e) {
    if (e instanceof OrderStatusChangedError) {
      return NextResponse.json(
        { error: e.message },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "操作失败，请稍后重试" },
      { status: 500 }
    );
  }
}
