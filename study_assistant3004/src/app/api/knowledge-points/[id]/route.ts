import { prisma } from "@/lib/prisma";
import { pickEnum } from "@/lib/utils";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  const data: {
    title?: string;
    content?: string;
    note?: string;
    tags?: string;
    archived?: boolean;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    stage?: "NOT_STARTED" | "LEARNING" | "MASTERED" | "REVIEW";
    subjectId?: string;
  } = {};

  if (typeof body.title === "string" && body.title.trim())
    data.title = body.title.trim();
  if (typeof body.content === "string") data.content = body.content;
  if (typeof body.note === "string") data.note = body.note;
  if (typeof body.tags === "string") data.tags = body.tags;
  if (typeof body.archived === "boolean") data.archived = body.archived;
  if (typeof body.subjectId === "string") data.subjectId = body.subjectId;
  if (typeof body.difficulty === "string")
    data.difficulty = pickEnum(
      body.difficulty,
      ["EASY", "MEDIUM", "HARD"],
      "MEDIUM",
    );
  if (typeof body.stage === "string")
    data.stage = pickEnum(
      body.stage,
      ["NOT_STARTED", "LEARNING", "MASTERED", "REVIEW"],
      "NOT_STARTED",
    );

  const point = await prisma.knowledgePoint.update({
    where: { id },
    data,
  });
  return Response.json(point);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.knowledgePoint.delete({ where: { id } });
  return Response.json({ ok: true });
}
