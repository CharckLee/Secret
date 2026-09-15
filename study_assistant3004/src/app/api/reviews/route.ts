import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const subjectId = url.searchParams.get("subjectId");
  const where = subjectId ? { subjectId } : {};
  const reviews = await prisma.review.findMany({
    where,
    include: {
      subject: { select: { id: true, name: true, color: true } },
      knowledgePoint: { select: { id: true, title: true } },
      pathNode: { select: { id: true, title: true } },
    },
    orderBy: { date: "desc" },
  });
  return Response.json(reviews);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const date = typeof body.date === "string" ? new Date(body.date) : new Date();

  const review = await prisma.review.create({
    data: {
      date,
      gain: typeof body.gain === "string" ? body.gain : "",
      question: typeof body.question === "string" ? body.question : "",
      plan: typeof body.plan === "string" ? body.plan : "",
      difficulty: typeof body.difficulty === "string" ? body.difficulty : "",
      subjectId:
        typeof body.subjectId === "string" ? body.subjectId : null,
      knowledgePointId:
        typeof body.knowledgePointId === "string"
          ? body.knowledgePointId
          : null,
      pathNodeId:
        typeof body.pathNodeId === "string" ? body.pathNodeId : null,
    },
  });
  return Response.json(review, { status: 201 });
}
