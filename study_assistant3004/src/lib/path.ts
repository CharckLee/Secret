export interface SubjectNodeGroup {
  subjectId: string;
  subjectName: string;
  nodes: { id: string; title: string }[];
}

/**
 * 把节点按学科分组，用于"归档到节点"的选择器。
 * - 学科顺序按 `subjects` 传入顺序
 * - 节点顺序按 `nodes` 传入顺序
 * - 忽略没有节点的学科，以及学科未知的节点
 */
export function groupNodesBySubject(
  nodes: { id: string; title: string; subjectId: string }[],
  subjects: { id: string; name: string }[],
): SubjectNodeGroup[] {
  return subjects
    .map((s) => ({
      subjectId: s.id,
      subjectName: s.name,
      nodes: nodes
        .filter((n) => n.subjectId === s.id)
        .map((n) => ({ id: n.id, title: n.title })),
    }))
    .filter((g) => g.nodes.length > 0);
}

export interface NodeDeleteImpact {
  title: string;
  childCount: number;
  fileNames: string[];
}

/**
 * 生成"删除节点"确认弹窗的说明文案。
 * 默认**不删文件**（失去绑定后转入未归档区），删不删由用户在弹窗里另行选择，
 * 所以这里只陈述影响面。
 */
export function buildNodeDeleteWarning(input: NodeDeleteImpact): string {
  const lines = [`删除「${input.title}」？`];
  if (input.childCount > 0) {
    lines.push(`其 ${input.childCount} 个子节点会一并删除。`);
  }
  if (input.fileNames.length === 0) {
    lines.push("这些节点上没有绑定文件。");
  } else {
    const names = input.fileNames.slice(0, 3).join("、");
    const suffix = input.fileNames.length > 3 ? " 等" : "";
    lines.push(
      `绑定在这些节点上的 ${input.fileNames.length} 个文件（${names}${suffix}）默认转入未归档区，也可以选择一并删除。`,
    );
  }
  return lines.join("\n");
}
