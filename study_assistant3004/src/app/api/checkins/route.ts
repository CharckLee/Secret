import { prisma } from "@/lib/prisma";
import { normalizeIds, pickEnum } from "@/lib/utils";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const subjectId = url.searchParams.get("subjectId");
  const where = subjectId ? { subjectId } : {};
  const checkIns = await prisma.checkIn.findMany({
    where,
    include: {
      subject: { select: { id: true, name: true, color: true } },
      pathNode: { select: { id: true, title: true } },
    },
    orderBy: { date: "desc" },
  });
  return Response.json(checkIns);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const subjectId =
    typeof body.subjectId === "string" ? body.subjectId : "";
  if (!subjectId)
    return Response.json({ error: "请选择学科" }, { status: 400 });

  const durationMinutes = Math.max(
    0,
    Math.round(Number(body.durationMinutes) || 0),
  );
  const status = pickEnum(
    body.status,
    ["MASTERED", "PARTIAL", "REVIEW"],
    "PARTIAL",
  );
  const pathNodeId =
    typeof body.pathNodeId === "string" ? body.pathNodeId : null;
  const date = typeof body.date === "string" ? new Date(body.date) : new Date();

  const checkIn = await prisma.checkIn.create({
    data: {
      subjectId,
      durationMinutes,
      status,
      date,
      note: typeof body.note === "string" ? body.note : "",
      pathNodeId,
    },
  });

  // 闭环：已掌握打卡 → 自动完成对应节点 / 同步绑定文件完成
  if (status === "MASTERED") {
    if (pathNodeId) {
      await prisma.pathNode
        .update({ where: { id: pathNodeId }, data: { status: "COMPLETED" } })
        .catch(() => {});
      await prisma.studyFile
        .updateMany({
          where: { pathNodes: { some: { id: pathNodeId } } },
          data: { status: "COMPLETED" },
        })
        .catch(() => {});
    }
  }

  return Response.json(checkIn, { status: 201 });
}

/** 批量删除打卡记录，body: { ids: string[] } */
export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const ids = normalizeIds(body.ids);
  if (ids.length === 0) {
    return Response.json({ error: "请选择要删除的打卡记录" }, { status: 400 });
  }

  const result = await prisma.checkIn.deleteMany({
    where: { id: { in: ids } },
  });
  return Response.json({ ok: true, deleted: result.count });
}
