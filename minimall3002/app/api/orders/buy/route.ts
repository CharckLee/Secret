import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getMembershipDiscountRate, roundMoney } from "@/lib/utils";
import { InsufficientStockError } from "@/lib/errors";

// 直购请求校验
const BuyNowSchema = z.object({
  productId: z.number().int().positive("无效的商品"),
  quantity: z.number().int().min(1, "数量至少为1").max(999, "数量不能超过999"),
  address: z.string().min(1, "请填写收货地址").max(200, "地址不超过200字"),
  phone: z.string().min(1, "请填写联系电话").max(20, "电话不超过20位"),
  receiver: z.string().min(1, "请填写收货人").max(50, "收货人不超过50字"),
});

// POST /api/orders/buy — 单商品直接下单（不走购物车）
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效的请求数据" }, { status: 400 });
  }

  const parsed = BuyNowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { productId, quantity, address, phone, receiver } = parsed.data;

  // 查询商品
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }

  // 校验库存（不暴露精确库存数）
  if (quantity > product.stock) {
    return NextResponse.json(
      { error: "库存不足" },
      { status: 400 }
    );
  }

  // 查询用户会员等级（仅取 membershipLevel）
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { membershipLevel: true },
  });
  const discountRate = user
    ? getMembershipDiscountRate(user.membershipLevel)
    : 0;

  // 计算金额（使用分位精度）
  const subtotal = roundMoney(product.price * quantity);
  const discount = roundMoney(subtotal * discountRate);
  const total = roundMoney(subtotal - discount);

  // 事务：创建订单 → 创建明细 → 扣库存
  try {
    const order = await prisma.$transaction(async (tx) => {
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

      await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          productId: product.id,
          quantity,
          price: product.price,
        },
      });

      // 原子扣减库存
      const result = await tx.product.updateMany({
        where: { id: product.id, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      });
      if (result.count === 0) {
        throw new InsufficientStockError();
      }

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
