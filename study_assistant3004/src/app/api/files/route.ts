import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

export async function GET(request: Request) {
  const url = new URL(request.url);
  const subjectId = url.searchParams.get("subjectId");
  // 只返回仍绑定着节点的文件：解绑后的残留不应出现在归档文件里
  const where = {
    ...(subjectId ? { subjectId } : {}),
    pathNodes: { some: {} },
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

  // 文件必须绑定章节（节点）
  const pathNodeIdsRaw = formData.get("pathNodeIds");
  const pathNodeIds =
    typeof pathNodeIdsRaw === "string"
      ? pathNodeIdsRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
  if (pathNodeIds.length === 0) {
    return Response.json({ error: "请选择要绑定的章节" }, { status: 400 });
  }

  // 学科：优先用传入值，否则从节点推导
  let resolvedSubjectId =
    typeof subjectId === "string" && subjectId ? subjectId : "";
  if (!resolvedSubjectId) {
    const node = await prisma.pathNode.findUnique({
      where: { id: pathNodeIds[0] },
      select: { subjectId: true },
    });
    resolvedSubjectId = node?.subjectId ?? "";
  }
  if (!resolvedSubjectId) {
    return Response.json({ error: "无法确定学科" }, { status: 400 });
  }

  // 若绑定的章节均已完成，则文件初始即为完成状态
  const boundNodes = await prisma.pathNode.findMany({
    where: { id: { in: pathNodeIds } },
    select: { status: true },
  });
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
