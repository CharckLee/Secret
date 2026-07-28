import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Admin 权限校验
async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限访问" }, { status: 403 });
  }
  return null;
}

// 创建/更新商品校验
const ProductSchema = z.object({
  name: z.string().min(1, "商品名称为必填项").max(100, "名称不超过100字"),
  description: z.string().min(1, "商品描述为必填项").max(2000, "描述不超过2000字"),
  price: z.number().positive("价格必须大于0").max(99999999, "价格不超过99999999"),
  imageUrl: z.string().url("请输入有效的URL").optional().or(z.literal("")),
  stock: z.number().int("库存必须为整数").min(0, "库存不能为负数").max(999999, "库存不超过999999"),
  categoryId: z.number().int().positive("请选择分类"),
});

// GET /api/admin/products — 商品列表（管理端）
export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const page = z.coerce.number().min(1).catch(1).parse(searchParams.get("page"));
  const pageSize = 10;

  // 查询条件
  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }
  if (category) {
    const catId = parseInt(category, 10);
    if (!isNaN(catId)) where.categoryId = catId;
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    products,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

// POST /api/admin/products — 创建商品
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效的请求数据" }, { status: 400 });
  }

  const parsed = ProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { name, description, price, imageUrl, stock, categoryId } = parsed.data;

  // 验证分类存在
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    return NextResponse.json({ error: "分类不存在" }, { status: 400 });
  }

  try {
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        imageUrl: imageUrl || null,
        stock,
        categoryId,
      },
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建失败，请稍后重试" }, { status: 500 });
  }
}
