import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

/**
 * 文件列表。
 * - 默认（scope=archived）：只返回**仍绑定着节点**的文件，即"归档文件"
 * - scope=unarchived：只返回**没绑定任何节点**的文件，即"未归档区"的内容
 *
 * 未归档的文件不参与进度与统计（统计层同样按 pathNodes 过滤）。
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const subjectId = url.searchParams.get("subjectId");
  const scope = url.searchParams.get("scope") ?? "archived";

  const where = {
    ...(subjectId ? { subjectId } : {}),
    pathNodes: scope === "unarchived" ? { none: {} } : { some: {} },
  };

  const files = await prisma.studyFile.findMany({
    where,
    include: {
      subject: { select: { id: true, name: true, color: true } },
      pathNodes: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(files);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const subjectId = formData.get("subjectId");

  if (!(file instanceof File)) {
    return Response.json({ error: "请选择要上传的文件" }, { status: 400 });
  }

  // 章节可以不选：这类文件进入"未归档区"，之后可手动归档到某个节点
  const pathNodeIdsRaw = formData.get("pathNodeIds");
  const pathNodeIds =
    typeof pathNodeIdsRaw === "string"
      ? pathNodeIdsRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  // 学科：优先用传入值；只绑定了节点时才从节点推导
  let resolvedSubjectId =
    typeof subjectId === "string" && subjectId ? subjectId : "";
  if (!resolvedSubjectId && pathNodeIds.length > 0) {
    const node = await prisma.pathNode.findUnique({
      where: { id: pathNodeIds[0] },
      select: { subjectId: true },
    });
    resolvedSubjectId = node?.subjectId ?? "";
  }
  if (!resolvedSubjectId) {
    return Response.json({ error: "请选择学科" }, { status: 400 });
  }

  // 若绑定的章节均已完成，则文件初始即为完成状态
  const boundNodes =
    pathNodeIds.length > 0
      ? await prisma.pathNode.findMany({
          where: { id: { in: pathNodeIds } },
          select: { status: true },
        })
      : [];
  const initialStatus =
    boundNodes.length > 0 && boundNodes.every((n) => n.status === "COMPLETED")
      ? "COMPLETED"
      : "NOT_STARTED";

  const id = crypto.randomUUID();
  const safeName = file.name.replace(/[^\w.\-\u4e00-\u9fa5]/g, "_");
  await mkdir(UPLOAD_DIR, { recursive: true });
  const storedPath = path.join(UPLOAD_DIR, `${id}_${safeName}`);
  await writeFile(storedPath, Buffer.from(await file.arrayBuffer()));

  const record = await prisma.studyFile.create({
    data: {
      id,
      filename: file.name,
      storedPath,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      status: initialStatus,
      subjectId: resolvedSubjectId,
      pathNodes: { connect: pathNodeIds.map((nid) => ({ id: nid })) },
    },
  });

  return Response.json(record, { status: 201 });
}
