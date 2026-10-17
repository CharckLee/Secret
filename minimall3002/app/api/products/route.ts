import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// GET /api/products?search=xxx&category=slug&page=1
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const page = z.coerce.number().min(1).catch(1).parse(searchParams.get("page"));

  const pageSize = 9;

  // 构建查询条件
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }

  if (category) {
    where.category = { slug: category };
  }

  // 并行查询商品列表和总数
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return NextResponse.json({
    products,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  });
}
