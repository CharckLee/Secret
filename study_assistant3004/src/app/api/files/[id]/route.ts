import { readFile, unlink } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { pickEnum } from "@/lib/utils";

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
  const status = pickEnum(
    body.status,
    ["NOT_STARTED", "LEARNING", "COMPLETED", "KEY_ARCHIVE"],
    "NOT_STARTED",
  );
  const file = await prisma.studyFile.update({
    where: { id },
    data: { status },
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
