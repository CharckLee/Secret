import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pickEnum } from "@/lib/utils";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const subjectId = url.searchParams.get("subjectId");
  const q = url.searchParams.get("q")?.trim();

  const where: Prisma.KnowledgePointWhereInput = {};
  if (subjectId) where.subjectId = subjectId;
  if (q) where.title = { contains: q };

  const points = await prisma.knowledgePoint.findMany({
    where,
    include: { subject: { select: { id: true, name: true, color: true } } },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(points);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const subjectId =
    typeof body.subjectId === "string" ? body.subjectId : "";

  if (!title) return Response.json({ error: "标题不能为空" }, { status: 400 });
  if (!subjectId)
    return Response.json({ error: "请选择学科" }, { status: 400 });

  const point = await prisma.knowledgePoint.create({
    data: {
      title,
      subjectId,
      content: typeof body.content === "string" ? body.content : "",
      note: typeof body.note === "string" ? body.note : "",
      difficulty: pickEnum(body.difficulty, ["EASY", "MEDIUM", "HARD"], "MEDIUM"),
      stage: pickEnum(
        body.stage,
        ["NOT_STARTED", "LEARNING", "MASTERED", "REVIEW"],
        "NOT_STARTED",
      ),
      tags: typeof body.tags === "string" ? body.tags : "",
    },
  });
  return Response.json(point, { status: 201 });
}
