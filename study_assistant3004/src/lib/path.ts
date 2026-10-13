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
