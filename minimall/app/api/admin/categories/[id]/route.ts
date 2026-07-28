import { NextRequest, NextResponse } from "next/server";
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

// DELETE /api/admin/categories/[id] — 删除分类
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const categoryId = parseInt(id, 10);
  if (isNaN(categoryId)) {
    return NextResponse.json({ error: "无效的参数" }, { status: 400 });
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { _count: { select: { products: true } } },
  });

  if (!category) {
    return NextResponse.json({ error: "分类不存在" }, { status: 404 });
  }

  if (category._count.products > 0) {
    return NextResponse.json(
      { error: `无法删除，该分类下还有 ${category._count.products} 个商品` },
      { status: 400 }
    );
  }

  try {
    await prisma.category.delete({ where: { id: categoryId } });
    return NextResponse.json({ message: "已删除" });
  } catch {
    return NextResponse.json({ error: "删除失败，请稍后重试" }, { status: 500 });
  }
}
