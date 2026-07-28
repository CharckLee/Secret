import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, getCurrentUser } from "@/lib/auth";
import { getMembershipDiscountRate } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

// 创建订单请求校验
const CreateOrderSchema = z.object({
  address: z.string().min(1, "请填写收货地址").max(200, "地址不超过200字"),
  phone: z.string().min(1, "请填写联系电话").max(20, "电话不超过20位"),
  receiver: z.string().min(1, "请填写收货人").max(50, "收货人不超过50字"),
});

// GET /api/orders — 我的订单列表
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.userId },
    include: {
      items: {
        select: {
          id: true,
          quantity: true,
          price: true,
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}

// POST /api/orders — 从购物车创建订单
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  // 解析请求体
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效的请求数据" }, { status: 400 });
  }

  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { address, phone, receiver } = parsed.data;

  // 查询购物车（含商品信息）
  const cartItems = await prisma.cartItem.findMany({
    where: { userId: session.userId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
        },
      },
    },
  });

  if (cartItems.length === 0) {
    return NextResponse.json({ error: "购物车为空" }, { status: 400 });
  }

  // 校验库存
  const outOfStock = cartItems.filter(
    (item) => item.quantity > item.product.stock
  );
  if (outOfStock.length > 0) {
    const names = outOfStock
      .map((item) => `${item.product.name}（库存 ${item.product.stock} 件）`)
      .join("、");
    return NextResponse.json(
      { error: `以下商品库存不足：${names}` },
      { status: 400 }
    );
  }

  // 获取用户当前会员等级折扣
  const user = await getCurrentUser();
  const discountRate = user
    ? getMembershipDiscountRate(user.membershipLevel)
    : 0;

  // 计算金额
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const discount = Math.round(subtotal * discountRate * 100) / 100;
  const total = Math.round((subtotal - discount) * 100) / 100;

  // 在事务中：创建订单 → 创建订单明细 → 扣减库存 → 清空购物车
  try {
    const order = await prisma.$transaction(async (tx) => {
      // 1. 创建订单
      const newOrder = await tx.order.create({
        data: {
          userId: session.userId,
          status: "PENDING",
          address,
          phone,
          receiver,
          total,
          discount,
        },
      });

      // 2. 创建订单明细 + 扣减库存
      for (const item of cartItems) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price, // 下单时的价格快照
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // 3. 清空用户的购物车
      await tx.cartItem.deleteMany({
        where: { userId: session.userId },
      });

      return newOrder;
    });

    return NextResponse.json({ orderId: order.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "下单失败，请稍后重试" },
      { status: 500 }
    );
  }
}
