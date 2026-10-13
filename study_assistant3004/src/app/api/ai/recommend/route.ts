import { prisma } from "@/lib/prisma";
import { getSubjectProgressRows } from "@/lib/queries";
import {
  buildPrompt,
  buildRuleRecommendation,
  callDeepSeek,
  parseAiRecommendation,
  type AiFocusNode,
} from "@/lib/ai";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const subjectId = url.searchParams.get("subjectId") || undefined;

  // 待推进节点：正在学习中的优先，其次是尚未写笔记的
  const nodes = await prisma.pathNode.findMany({
    where: {
      ...(subjectId ? { subjectId } : {}),
      OR: [{ status: "LEARNING" }, { note: "" }],
    },
    select: {
      title: true,
      status: true,
      note: true,
      subject: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { order: "asc" }],
    take: 30,
  });

  const focusNodes: AiFocusNode[] = nodes.map((n) => ({
    title: n.title,
    subjectName: n.subject.name,
    status: n.status,
    note: n.note,
  }));

  const subjects = await getSubjectProgressRows();
  const subjectName = subjectId
    ? subjects.find((s) => s.id === subjectId)?.name
    : undefined;

  const hasKey = Boolean(process.env.DEEPSEEK_API_KEY);
  let source: "ai" | "rule" = hasKey ? "ai" : "rule";

  let recommendation = buildRuleRecommendation({ nodes: focusNodes });

  if (hasKey) {
    try {
      const text = await callDeepSeek(
        buildPrompt({ subjectName, nodes: focusNodes }),
      );
      const parsed = parseAiRecommendation(text);
      if (parsed) recommendation = parsed;
      else source = "rule";
    } catch {
      source = "rule";
    }
  }

  return Response.json({ source, recommendation });
}
