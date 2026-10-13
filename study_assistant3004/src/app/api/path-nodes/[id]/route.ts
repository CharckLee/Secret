import { unlink } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { pickEnum } from "@/lib/utils";

/** 收集节点及其所有后代节点的 id */
async function collectDescendantIds(id: string): Promise<string[]> {
  const ids: string[] = [];
  const queue = [id];
  while (queue.length) {
    const cur = queue.pop()!;
    ids.push(cur);
    const children = await prisma.pathNode.findMany({
      where: { parentId: cur },
      select: { id: true },
    });
    queue.push(...children.map((c) => c.id));
  }
  return ids;
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

  const data: {
    title?: string;
    note?: string;
    kind?: string;
    status?: "NOT_STARTED" | "LEARNING" | "COMPLETED";
    parentId?: string | null;
    files?: { set: { id: string }[] };
  } = {};

  if (typeof body.title === "string" && body.title.trim())
    data.title = body.title.trim();
  if (typeof body.note === "string") data.note = body.note;
  if (typeof body.kind === "string") data.kind = body.kind;
  if (typeof body.status === "string")
    data.status = pickEnum(
      body.status,
      ["NOT_STARTED", "LEARNING", "COMPLETED"],
      "NOT_STARTED",
    );
  if (body.parentId === null) data.parentId = null;
  else if (typeof body.parentId === "string") data.parentId = body.parentId;

  // 只解绑，不删除：失去绑定的文件会进入"未归档区"，由用户手动管理，
  // 不会被自动删掉（数据库记录与磁盘文件都保留）
  if (Array.isArray(body.fileIds)) {
    data.files = {
      set: (body.fileIds as string[]).map((fid) => ({ id: fid })),
    };
  }

  const node = await prisma.pathNode.update({
    where: { id },
    data,
    include: {
      files: { select: { id: true, filename: true } },
    },
  });

  // 节点完成 → 绑定文件也进入完成状态
  if (data.status === "COMPLETED") {
    await prisma.studyFile.updateMany({
      where: { pathNodes: { some: { id } } },
      data: { status: "COMPLETED" },
    });
  }

  return Response.json(node);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // 收集该节点及所有后代，删除其绑定文件（数据库记录 + 磁盘文件）
  const nodeIds = await collectDescendantIds(id);
  const files = await prisma.studyFile.findMany({
    where: { pathNodes: { some: { id: { in: nodeIds } } } },
    select: { id: true, storedPath: true },
  });

  // 级联删除子树（onDelete: Cascade 处理 parent 关系）
  await prisma.pathNode.delete({ where: { id } });

  if (files.length) {
    await prisma.studyFile.deleteMany({
      where: { id: { in: files.map((f) => f.id) } },
    });
    await Promise.all(files.map((f) => unlink(f.storedPath).catch(() => {})));
  }

  return Response.json({ ok: true });
}
