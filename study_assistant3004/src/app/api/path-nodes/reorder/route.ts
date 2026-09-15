import { prisma } from "@/lib/prisma";

interface ReorderItem {
  id: string;
  parentId: string | null;
  order: number;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    items?: unknown;
  };
  const items = Array.isArray(body.items) ? (body.items as ReorderItem[]) : [];

  if (items.length === 0) {
    return Response.json({ ok: true });
  }

  await prisma.$transaction(
    items.map((it) =>
      prisma.pathNode.update({
        where: { id: it.id },
        data: { parentId: it.parentId ?? null, order: it.order },
      }),
    ),
  );

  return Response.json({ ok: true });
}
