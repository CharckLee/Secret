import { prisma } from "@/lib/prisma";
import { inferKind } from "@/lib/path";

/** subjectId 可选：不传则返回全部节点（用于"归档到节点"的分组选择器） */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const subjectId = url.searchParams.get("subjectId");
  const nodes = await prisma.pathNode.findMany({
    where: subjectId ? { subjectId } : {},
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
  const parentId = typeof body.parentId === "string" ? body.parentId : null;

  if (!title) return Response.json({ error: "节点标题不能为空" }, { status: 400 });
  if (!subjectId)
    return Response.json({ error: "请选择学科" }, { status: 400 });

  // 类型由父节点决定，不需要用户在表单里手选
  const parent = parentId
    ? await prisma.pathNode.findUnique({
        where: { id: parentId },
        select: { kind: true },
      })
    : null;
  const kind = inferKind(parent?.kind ?? null);

  const siblings = await prisma.pathNode.count({
    where: { subjectId, parentId },
  });

  const node = await prisma.pathNode.create({
    data: {
      title,
      subjectId,
      parentId,
      kind,
      note: typeof body.note === "string" ? body.note : "",
      order: siblings,
    },
  });
  return Response.json(node, { status: 201 });
}
