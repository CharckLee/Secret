import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// 更新商品校验（字段均可选）
const UpdateProductSchema = z.object({
  name: z.string().min(1, "商品名称为必填项").max(100).optional(),
  description: z.string().min(1).max(2000).optional(),
  price: z.number().positive("价格必须大于0").max(99999999).optional(),
  imageUrl: z.string().optional().or(z.literal("")),
  stock: z.number().int().min(0).max(999999).optional(),
  categoryId: z.number().int().positive().optional(),
});

// GET /api/admin/products/[id] — 商品详情
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const productId = parseInt(id, 10);
  if (isNaN(productId)) {
    return NextResponse.json({ error: "无效的参数" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: { select: { id: true, name: true } } },
  });

  if (!product) {
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }

  return NextResponse.json({ product });
}

// PUT /api/admin/products/[id] — 更新商品
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const productId = parseInt(id, 10);
  if (isNaN(productId)) {
    return NextResponse.json({ error: "无效的参数" }, { status: 400 });
  }

  // 验证商品存在
  const existing = await prisma.product.findUnique({ where: { id: productId } });
  if (!existing) {
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效的请求数据" }, { status: 400 });
  }

  const parsed = UpdateProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  // 如果有 categoryId，验证分类存在
  if (parsed.data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: parsed.data.categoryId },
    });
    if (!category) {
      return NextResponse.json({ error: "分类不存在" }, { status: 400 });
    }
  }

  // 处理 imageUrl：空字符串转为 null（清空图片）
  const imageUrl = parsed.data.imageUrl === "" ? null : parsed.data.imageUrl;

  try {
    const product = await prisma.product.update({
      where: { id: productId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { ...parsed.data, imageUrl } as any,
      include: { category: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "更新失败，请稍后重试" }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id] — 删除商品
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const productId = parseInt(id, 10);
  if (isNaN(productId)) {
    return NextResponse.json({ error: "无效的参数" }, { status: 400 });
  }

  const existing = await prisma.product.findUnique({ where: { id: productId } });
  if (!existing) {
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }

  try {
    await prisma.product.delete({ where: { id: productId } });
    return NextResponse.json({ message: "已删除" });
  } catch (e) {
    // 区分外键约束错误和其他异常
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      (e.code === "P2003" || e.code === "P2014")
    ) {
      return NextResponse.json(
        { error: "无法删除，该商品已有订单或购物车关联" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "删除失败，请稍后重试" },
      { status: 500 }
    );
  }
}
