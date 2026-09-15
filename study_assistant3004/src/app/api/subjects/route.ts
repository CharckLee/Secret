import { prisma } from "@/lib/prisma";
import { getSubjectProgressRows } from "@/lib/queries";

export async function GET() {
  return Response.json(await getSubjectProgressRows());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return Response.json({ error: "学科名称不能为空" }, { status: 400 });
  }

  const existing = await prisma.subject.findUnique({ where: { name } });
  if (existing) {
    return Response.json({ error: "学科名称已存在" }, { status: 409 });
  }

  const subject = await prisma.subject.create({
    data: {
      name,
      color: typeof body.color === "string" ? body.color : "#3b82f6",
      description:
        typeof body.description === "string" ? body.description : "",
    },
  });
  return Response.json(subject, { status: 201 });
}
