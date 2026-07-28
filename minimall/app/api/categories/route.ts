import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/categories
export async function GET() {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { id: "asc" },
  });

  const result = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    productCount: cat._count.products,
  }));

  return NextResponse.json(result);
}
