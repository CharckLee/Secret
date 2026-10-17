import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getMembershipDiscountRate, roundMoney } from "@/lib/utils";
import { InsufficientStockError } from "@/lib/errors";

// 创建订单请求校验
const CreateOrderSchema = z.object({
  address: z.string().min(1, "请填写收货地址").max(200, "地址不超过200字"),
  phone: z.string().min(1, "请填写联系电话").max(20, "电话不超过20位"),
  receiver: z.string().min(1, "请填写收货人").max(50, "收货人不超过50字"),
});

// GET /api/orders — 我的订单列表
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const orders = await prisma.order.findMany({
    where: { userId },
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
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

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
    where: { userId },
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

  // 校验库存（不暴露精确库存数）
  const outOfStock = cartItems.filter(
    (item) => item.quantity > item.product.stock
  );
  if (outOfStock.length > 0) {
    const names = outOfStock.map((item) => item.product.name).join("、");
    return NextResponse.json(
      { error: `以下商品库存不足：${names}` },
      { status: 400 }
    );
  }

  // 查询用户会员等级（仅取 membershipLevel，不重复调用 getSession）
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { membershipLevel: true },
  });
  const discountRate = user
    ? getMembershipDiscountRate(user.membershipLevel)
    : 0;

  // 计算金额（使用分位精度）
  const subtotal = cartItems.reduce(
    (sum, item) => sum + roundMoney(item.product.price * item.quantity),
    0
  );
  const discount = roundMoney(subtotal * discountRate);
  const total = roundMoney(subtotal - discount);

  // 在事务中：创建订单 → 批量创建明细 → 逐项扣减库存 → 清空购物车
  try {
    const order = await prisma.$transaction(async (tx) => {
      // 1. 创建订单
      const newOrder = await tx.order.create({
        data: {
          userId,
          status: "PENDING",
          address,
          phone,
          receiver,
          total,
          discount,
        },
      });

      // 2. 批量创建订单明细
      await tx.orderItem.createMany({
        data: cartItems.map((item) => ({
          orderId: newOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.product.price,
        })),
      });

      // 3. 逐项原子扣减库存（必须串行以保证原子性）
      for (const item of cartItems) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          throw new InsufficientStockError(item.product.name);
        }
      }

      // 4. 清空用户的购物车
      await tx.cartItem.deleteMany({
        where: { userId },
      });

      return newOrder;
    });

    return NextResponse.json({ orderId: order.id }, { status: 201 });
  } catch (e) {
    if (e instanceof InsufficientStockError) {
      return NextResponse.json(
        { error: e.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "下单失败，请稍后重试" },
      { status: 500 }
    );
  }
}
