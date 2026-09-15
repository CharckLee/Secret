import { unlink } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { calcSubjectProgress } from "@/lib/progress";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      knowledgePoints: { orderBy: { createdAt: "desc" } },
      pathNodes: {
        orderBy: { order: "asc" },
        include: {
          knowledgePoints: { select: { id: true, title: true } },
          files: { select: { id: true, filename: true } },
        },
      },
      files: {
        where: { pathNodes: { some: {} } },
        orderBy: { createdAt: "desc" },
      },
      reviews: { orderBy: { date: "desc" } },
      checkIns: {
        orderBy: { date: "desc" },
        include: {
          knowledgePoint: { select: { id: true, title: true } },
          pathNode: { select: { id: true, title: true } },
        },
      },
    },
  });
  if (!subject) {
    return Response.json({ error: "学科不存在" }, { status: 404 });
  }

  const progress = calcSubjectProgress({
    nodes: subject.pathNodes,
    knowledgePoints: subject.knowledgePoints,
    files: subject.files,
  });
  const totalDurationMinutes = subject.checkIns.reduce(
    (a, c) => a + c.durationMinutes,
    0,
  );

  return Response.json({ ...subject, progress, totalDurationMinutes });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const data: { name?: string; color?: string; description?: string } = {};
  if (typeof body.name === "string" && body.name.trim())
    data.name = body.name.trim();
  if (typeof body.color === "string") data.color = body.color;
  if (typeof body.description === "string")
    data.description = body.description;

  try {
    const subject = await prisma.subject.update({ where: { id }, data });
    return Response.json(subject);
  } catch {
    return Response.json(
      { error: "更新失败，名称可能已存在" },
      { status: 409 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const files = await prisma.studyFile.findMany({
    where: { subjectId: id },
    select: { storedPath: true },
  });
  await prisma.subject.delete({ where: { id } });
  await Promise.all(files.map((f) => unlink(f.storedPath).catch(() => {})));
  return Response.json({ ok: true });
}
