import { readFile, unlink } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { normalizeIds, pickEnum } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const file = await prisma.studyFile.findUnique({ where: { id } });
  if (!file) return Response.json({ error: "文件不存在" }, { status: 404 });

  const buffer = await readFile(file.storedPath).catch(() => null);
  if (!buffer) return Response.json({ error: "文件已丢失" }, { status: 404 });

  return new Response(buffer, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    },
  });
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
    status?: "NOT_STARTED" | "LEARNING" | "COMPLETED" | "KEY_ARCHIVE";
    pathNodes?: { set: { id: string }[] };
  } = {};

  // 只有显式传了 status 才改状态，避免"仅绑定节点"时把状态重置
  if (typeof body.status === "string") {
    data.status = pickEnum(
      body.status,
      ["NOT_STARTED", "LEARNING", "COMPLETED", "KEY_ARCHIVE"],
      "NOT_STARTED",
    );
  }

  // 归档到节点：把未归档文件绑定到指定节点（传空数组则解绑，回到未归档区）
  if (Array.isArray(body.pathNodeIds)) {
    const nodeIds = normalizeIds(body.pathNodeIds);
    data.pathNodes = { set: nodeIds.map((nid) => ({ id: nid })) };
  }

  const file = await prisma.studyFile.update({
    where: { id },
    data,
    include: {
      subject: { select: { id: true, name: true, color: true } },
      pathNodes: { select: { id: true, title: true } },
    },
  });
  return Response.json(file);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const file = await prisma.studyFile.findUnique({ where: { id } });
  if (file) {
    await prisma.studyFile.delete({ where: { id } });
    await unlink(file.storedPath).catch(() => {});
  }
  return Response.json({ ok: true });
}
