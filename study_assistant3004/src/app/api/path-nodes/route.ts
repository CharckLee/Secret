import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const subjectId = url.searchParams.get("subjectId");
  if (!subjectId)
    return Response.json({ error: "缺少 subjectId" }, { status: 400 });
  const nodes = await prisma.pathNode.findMany({
    where: { subjectId },
    orderBy: { order: "asc" },
  });
  return Response.json(nodes);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const subjectId =
    typeof body.subjectId === "string" ? body.subjectId : "";

  if (!title) return Response.json({ error: "节点标题不能为空" }, { status: 400 });
  if (!subjectId)
    return Response.json({ error: "请选择学科" }, { status: 400 });

  const siblings = await prisma.pathNode.count({
    where: {
      subjectId,
      parentId:
        typeof body.parentId === "string" ? body.parentId : null,
    },
  });

  const node = await prisma.pathNode.create({
    data: {
      title,
      subjectId,
      parentId:
        typeof body.parentId === "string" ? body.parentId : null,
      kind: typeof body.kind === "string" ? body.kind : "chapter",
      note: typeof body.note === "string" ? body.note : "",
      order: siblings,
    },
  });
  return Response.json(node, { status: 201 });
}
