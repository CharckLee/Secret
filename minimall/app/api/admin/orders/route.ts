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

// GET /api/admin/orders — 所有订单列表（管理端）
export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") || "";
  const page = z.coerce.number().min(1).catch(1).parse(searchParams.get("page"));
  const pageSize = 15;

  // 查询条件
  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({
    orders,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
