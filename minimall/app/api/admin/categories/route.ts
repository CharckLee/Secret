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

// 创建分类校验
const CreateCategorySchema = z.object({
  name: z.string().min(1, "分类名称为必填项").max(50, "名称不超过50字"),
  slug: z.string().min(1, "标识为必填项").max(50)
    .regex(/^[a-z0-9-]+$/, "标识只能包含小写字母、数字和连字符"),
});

// GET /api/admin/categories — 分类列表（含商品数）
export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { products: true } },
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({
    categories: categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      productCount: cat._count.products,
    })),
  });
}

// POST /api/admin/categories — 创建分类
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效的请求数据" }, { status: 400 });
  }

  const parsed = CreateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { name, slug } = parsed.data;

  // 检查名称或标识是否已存在
  const existing = await prisma.category.findFirst({
    where: { OR: [{ name }, { slug }] },
  });
  if (existing) {
    if (existing.name === name) {
      return NextResponse.json({ error: "分类名称已存在" }, { status: 400 });
    }
    return NextResponse.json({ error: "分类标识已存在" }, { status: 400 });
  }

  try {
    const category = await prisma.category.create({
      data: { name, slug },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建失败，请稍后重试" }, { status: 500 });
  }
}
