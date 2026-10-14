import type { NodeStatus } from "@/types";

/** 节点的一级类型：章 / 节 / 知识点（对应 schema 的 `kind` 字段） */
export type NodeKind = "chapter" | "section" | "point";

export interface KindVisual {
  /** 中文短名，用于工具提示与无障碍标签 */
  label: string;
  /** 标题的附加样式 */
  titleClass: string;
  /** 是否显示前置圆点（"点"用） */
  dot: boolean;
  /** 是否显示左侧竖条（"章"用） */
  bar: boolean;
}

const KIND_VISUALS: Record<NodeKind, KindVisual> = {
  chapter: {
    label: "章",
    titleClass: "font-semibold text-slate-900",
    dot: false,
    bar: true,
  },
  section: {
    label: "节",
    titleClass: "font-medium text-slate-800",
    dot: false,
    bar: false,
  },
  point: {
    label: "点",
    titleClass: "font-normal text-slate-700",
    dot: true,
    bar: false,
  },
};

/**
 * 把 `kind` 映射成树上的视觉差异。
 * 未知或空值一律按"点"处理，这样历史数据里 kind 异常的节点也不会失去样式。
 */
export function kindVisual(kind: string): KindVisual {
  return KIND_VISUALS[kind as NodeKind] ?? KIND_VISUALS.point;
}

/**
 * 根据父节点的 kind 推断新节点的 kind：
 * 顶层是"章"，章的下一层是"节"，再往下都是"点"。
 * 有了它，用户新建节点时不必手选类型。
 */
export function inferKind(parentKind: string | null): NodeKind {
  if (parentKind === null) return "chapter";
  if (parentKind === "chapter") return "section";
  return "point";
}

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

// ---------------------------------------------------------------------------
// 学习路径：树序、下一节、统计
// ---------------------------------------------------------------------------

export interface PathNodeLike {
  id: string;
  title: string;
  status: NodeStatus;
  parentId: string | null;
  order: number;
  note: string;
}

/** 每个节点 id 对应的父节点 id 集合（用于判断哪些节点是父节点） */
function parentIdsOf(nodes: PathNodeLike[]): Set<string> {
  return new Set(
    nodes.map((n) => n.parentId).filter((id): id is string => id !== null),
  );
}

/**
 * 按树序深度优先展开：父在前、子随后，同级按 `order` 升序。
 * `parentId` 指向不存在节点的，当作根处理。
 */
export function flattenTree<T extends PathNodeLike>(nodes: T[]): T[] {
  const ids = new Set(nodes.map((n) => n.id));
  const childrenOf = new Map<string | null, T[]>();

  for (const node of nodes) {
    const key = node.parentId && ids.has(node.parentId) ? node.parentId : null;
    const list = childrenOf.get(key);
    if (list) list.push(node);
    else childrenOf.set(key, [node]);
  }
  for (const list of childrenOf.values()) {
    list.sort((a, b) => a.order - b.order);
  }

  const out: T[] = [];
  const walk = (parentId: string | null) => {
    for (const node of childrenOf.get(parentId) ?? []) {
      out.push(node);
      walk(node.id);
    }
  };
  walk(null);
  return out;
}

/**
 * 找"下一个该学的节"（叶子节点）：
 * 1. 先看有没有被**显式标记为学习中**的叶子 → 有就用它（人的意图优先）
 * 2. 否则按树序取第一个"未开始"的叶子
 * 3. 全学完了返回 null
 */
export function findNextNode<T extends PathNodeLike>(nodes: T[]): T | null {
  const hasChild = parentIdsOf(nodes);
  const leaves = flattenTree(nodes).filter((n) => !hasChild.has(n.id));

  const learning = leaves.find((n) => n.status === "LEARNING");
  if (learning) return learning;

  return leaves.find((n) => n.status === "NOT_STARTED") ?? null;
}

/** 某节点的祖先标题链，从顶层到直接父节点（不含自身） */
export function nodePathTitles<T extends PathNodeLike>(
  nodes: T[],
  id: string,
): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const titles: string[] = [];
  const guard = new Set<string>();
  let cursor = byId.get(id)?.parentId ?? null;

  while (cursor && byId.has(cursor) && !guard.has(cursor)) {
    guard.add(cursor);
    const parent = byId.get(cursor)!;
    titles.unshift(parent.title);
    cursor = parent.parentId;
  }
  return titles;
}

export interface NodeStats {
  /** 所有层级的节点数 */
  total: number;
  /** 叶子节点数 —— 也就是可学的"节"数 */
  leaves: number;
  /** 已完成的叶子数 */
  completedLeaves: number;
  /** 写了笔记的节点数 */
  withNote: number;
}

/** 节点维度统计（不依赖打卡数据） */
export function calcNodeStats(nodes: PathNodeLike[]): NodeStats {
  const hasChild = parentIdsOf(nodes);
  const leaves = nodes.filter((n) => !hasChild.has(n.id));
  return {
    total: nodes.length,
    leaves: leaves.length,
    completedLeaves: leaves.filter((n) => n.status === "COMPLETED").length,
    withNote: nodes.filter((n) => n.note.trim().length > 0).length,
  };
}

export interface ContinueItem {
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  nodeId: string;
  nodeTitle: string;
  /** 父链标题，从顶层到直接父节点（不含自身） */
  pathTitles: string[];
  note: string;
  /** true = 用户显式标记"学习中"的节点，false = 自动推荐的下一节 */
  explicit: boolean;
}

/** 为每个还有待学内容的学科挑出"下一节"，学科顺序按传入顺序 */
export function buildContinueItems(
  subjects: { id: string; name: string; color: string }[],
  nodes: (PathNodeLike & { subjectId: string })[],
): ContinueItem[] {
  const items: ContinueItem[] = [];
  for (const subject of subjects) {
    const mine = nodes.filter((n) => n.subjectId === subject.id);
    if (mine.length === 0) continue;

    const next = findNextNode(mine);
    if (!next) continue;

    items.push({
      subjectId: subject.id,
      subjectName: subject.name,
      subjectColor: subject.color,
      nodeId: next.id,
      nodeTitle: next.title,
      pathTitles: nodePathTitles(mine, next.id),
      note: next.note,
      explicit: next.status === "LEARNING",
    });
  }
  return items;
}
