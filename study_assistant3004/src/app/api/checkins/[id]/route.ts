import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const existing = await prisma.checkIn.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return Response.json({ error: "打卡记录不存在" }, { status: 404 });
  }
  await prisma.checkIn.delete({ where: { id } });
  return Response.json({ ok: true });
}
