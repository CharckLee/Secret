import { prisma } from "@/lib/prisma";
import { getSubjectProgressRows } from "@/lib/queries";
import {
  buildPrompt,
  buildRuleRecommendation,
  callDeepSeek,
  parseAiRecommendation,
} from "@/lib/ai";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const subjectId = url.searchParams.get("subjectId") || undefined;

  const where = subjectId ? { subjectId } : {};
  const weakPoints = await prisma.knowledgePoint.findMany({
    where: {
      ...where,
      OR: [
        { stage: "LEARNING" },
        { stage: "REVIEW" },
        { stage: { not: "MASTERED" }, difficulty: "HARD" },
      ],
    },
    select: {
      title: true,
      stage: true,
      difficulty: true,
      subject: { select: { name: true } },
    },
    take: 30,
  });

  const subjects = await getSubjectProgressRows();
  const subjectName = subjectId
    ? subjects.find((s) => s.id === subjectId)?.name
    : undefined;

  const weakRows = weakPoints.map((w) => ({
    title: w.title,
    subjectName: w.subject.name,
    stage: w.stage,
    difficulty: w.difficulty,
  }));

  const hasKey = Boolean(process.env.DEEPSEEK_API_KEY);
  let source: "ai" | "rule" = hasKey ? "ai" : "rule";

  let recommendation = buildRuleRecommendation({ weakPoints: weakRows });

  if (hasKey) {
    try {
      const text = await callDeepSeek(
        buildPrompt({ subjectName, weakPoints: weakRows }),
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
