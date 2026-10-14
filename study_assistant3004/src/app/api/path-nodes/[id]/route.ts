import { unlink } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { pickEnum } from "@/lib/utils";
import { inferKind } from "@/lib/path";

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

/** 父节点的 kind 变了，整棵子树的 kind 要跟着重算（最多 5 层，开销可忽略） */
async function cascadeKind(
  parentId: string,
  parentKind: string,
): Promise<void> {
  const children = await prisma.pathNode.findMany({
    where: { parentId },
    select: { id: true },
  });
  for (const child of children) {
    const childKind = inferKind(parentKind);
    await prisma.pathNode.update({
      where: { id: child.id },
      data: { kind: childKind },
    });
    await cascadeKind(child.id, childKind);
  }
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
    status?: "NOT_STARTED" | "LEARNING" | "COMPLETED";
    parentId?: string | null;
    files?: { set: { id: string }[] };
  } = {};

  if (typeof body.title === "string" && body.title.trim())
    data.title = body.title.trim();
  if (typeof body.note === "string") data.note = body.note;
  // kind 不接受客户端指定：它由节点在树中的层级决定，见下方 parentId 分支
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

  // 移动了节点 → 它的层级变了，kind 与整棵子树都要重算
  if (data.parentId !== undefined) {
    const parent = data.parentId
      ? await prisma.pathNode.findUnique({
          where: { id: data.parentId },
          select: { kind: true },
        })
      : null;
    const kind = inferKind(parent?.kind ?? null);
    if (kind !== node.kind) {
      await prisma.pathNode.update({ where: { id }, data: { kind } });
      await cascadeKind(id, kind);
    }
  }

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
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  // 默认只删节点：绑定文件失去引用后进入未归档区（记录与磁盘文件都保留）
  const deleteFiles = url.searchParams.get("deleteFiles") === "true";

  if (!deleteFiles) {
    await prisma.pathNode.delete({ where: { id } });
    return Response.json({ ok: true, deletedFiles: 0 });
  }

  // 用户选择连带删除：文件记录与磁盘文件一并清理
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

  return Response.json({ ok: true, deletedFiles: files.length });
}
