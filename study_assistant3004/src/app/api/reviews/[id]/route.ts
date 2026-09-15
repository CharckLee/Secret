import { prisma } from "@/lib/prisma";

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
    gain?: string;
    question?: string;
    plan?: string;
    difficulty?: string;
  } = {};
  if (typeof body.gain === "string") data.gain = body.gain;
  if (typeof body.question === "string") data.question = body.question;
  if (typeof body.plan === "string") data.plan = body.plan;
  if (typeof body.difficulty === "string")
    data.difficulty = body.difficulty;

  const review = await prisma.review.update({ where: { id }, data });
  return Response.json(review);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.review.delete({ where: { id } });
  return Response.json({ ok: true });
}
