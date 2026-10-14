import { describe, expect, it } from "vitest";
import {
  buildContinueItems,
  buildNodeDeleteWarning,
  calcNodeStats,
  findNextNode,
  flattenTree,
  groupNodesBySubject,
  kindVisual,
  nodePathTitles,
} from "./path";
import type { PathNodeLike } from "./path";

/** 测试用最小节点构造器 */
function n(
  id: string,
  title: string,
  parentId: string | null,
  order: number,
  extra: Partial<PathNodeLike> = {},
): PathNodeLike {
  return {
    id,
    title,
    parentId,
    order,
    status: "NOT_STARTED",
    note: "",
    ...extra,
  };
}

describe("groupNodesBySubject", () => {
  it("groups nodes under their subject", () => {
    const r = groupNodesBySubject(
      [
        { id: "n1", title: "第一章", subjectId: "s1" },
        { id: "n2", title: "第二章", subjectId: "s1" },
        { id: "n3", title: "绪论", subjectId: "s2" },
      ],
      [
        { id: "s1", name: "数学" },
        { id: "s2", name: "物理" },
      ],
    );
    expect(r).toEqual([
      {
        subjectId: "s1",
        subjectName: "数学",
        nodes: [
          { id: "n1", title: "第一章" },
          { id: "n2", title: "第二章" },
        ],
      },
      {
        subjectId: "s2",
        subjectName: "物理",
        nodes: [{ id: "n3", title: "绪论" }],
      },
    ]);
  });

  it("skips subjects that have no nodes", () => {
    const r = groupNodesBySubject(
      [{ id: "n1", title: "A", subjectId: "s1" }],
      [
        { id: "s1", name: "有节点" },
        { id: "s2", name: "空学科" },
      ],
    );
    expect(r).toHaveLength(1);
    expect(r[0].subjectId).toBe("s1");
  });

  it("keeps the subject order given by the caller", () => {
    const r = groupNodesBySubject(
      [
        { id: "n1", title: "A", subjectId: "s2" },
        { id: "n2", title: "B", subjectId: "s1" },
      ],
      [
        { id: "s1", name: "先" },
        { id: "s2", name: "后" },
      ],
    );
    expect(r.map((g) => g.subjectId)).toEqual(["s1", "s2"]);
  });

  it("keeps the node order given by the caller", () => {
    const r = groupNodesBySubject(
      [
        { id: "n2", title: "第二个", subjectId: "s1" },
        { id: "n1", title: "第一个", subjectId: "s1" },
      ],
      [{ id: "s1", name: "数学" }],
    );
    expect(r[0].nodes.map((n) => n.id)).toEqual(["n2", "n1"]);
  });

  it("ignores nodes whose subject is unknown", () => {
    const r = groupNodesBySubject(
      [
        { id: "n1", title: "孤儿节点", subjectId: "ghost" },
        { id: "n2", title: "正常", subjectId: "s1" },
      ],
      [{ id: "s1", name: "数学" }],
    );
    expect(r).toHaveLength(1);
    expect(r[0].nodes.map((n) => n.id)).toEqual(["n2"]);
  });

  it("returns an empty list for empty input", () => {
    expect(groupNodesBySubject([], [])).toEqual([]);
  });
});

describe("buildNodeDeleteWarning", () => {
  it("mentions the node title and the child count", () => {
    const w = buildNodeDeleteWarning({
      title: "第一章",
      childCount: 3,
      fileNames: [],
    });
    expect(w).toContain("第一章");
    expect(w).toContain("3 个子节点");
  });

  it("omits the child sentence when there are no children", () => {
    const w = buildNodeDeleteWarning({
      title: "t",
      childCount: 0,
      fileNames: [],
    });
    expect(w).not.toContain("子节点");
  });

  it("says bound files go to the unarchived area by default", () => {
    const w = buildNodeDeleteWarning({
      title: "t",
      childCount: 0,
      fileNames: ["a.jpg", "b.jpg"],
    });
    expect(w).toContain("2 个文件");
    expect(w).toContain("未归档");
  });

  it("does not claim the files will be deleted (deletion is a separate choice)", () => {
    const w = buildNodeDeleteWarning({
      title: "t",
      childCount: 0,
      fileNames: ["x.jpg"],
    });
    expect(w).not.toContain("无法恢复");
  });

  it("lists up to three file names and elides the rest", () => {
    const w = buildNodeDeleteWarning({
      title: "t",
      childCount: 0,
      fileNames: ["a.jpg", "b.jpg", "c.jpg", "d.jpg"],
    });
    expect(w).toContain("4 个文件");
    expect(w).toContain("a.jpg、b.jpg、c.jpg");
    expect(w).toContain("等");
    expect(w).not.toContain("d.jpg");
  });

  it("says there are no bound files when the list is empty", () => {
    const w = buildNodeDeleteWarning({
      title: "t",
      childCount: 0,
      fileNames: [],
    });
    expect(w).toContain("没有绑定文件");
  });

  it("puts the title on the first line", () => {
    const w = buildNodeDeleteWarning({
      title: "微管",
      childCount: 2,
      fileNames: ["x.jpg"],
    });
    expect(w.split("\n")[0]).toContain("微管");
  });
});

describe("flattenTree", () => {
  it("returns nodes depth-first with parents before children", () => {
    const nodes = [
      n("a", "A", null, 0),
      n("a1", "A1", "a", 0),
      n("a2", "A2", "a", 1),
      n("b", "B", null, 1),
    ];
    expect(flattenTree(nodes).map((x) => x.id)).toEqual(["a", "a1", "a2", "b"]);
  });

  it("orders siblings by the order field", () => {
    const nodes = [n("b", "B", null, 1), n("a", "A", null, 0)];
    expect(flattenTree(nodes).map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("treats nodes whose parent is missing as roots", () => {
    const nodes = [n("x", "X", "ghost", 0)];
    expect(flattenTree(nodes).map((x) => x.id)).toEqual(["x"]);
  });

  it("handles empty input", () => {
    expect(flattenTree([])).toEqual([]);
  });
});

describe("findNextNode", () => {
  it("prefers a node explicitly marked as learning", () => {
    const nodes = [
      n("a", "A", null, 0),
      n("a1", "A1", "a", 0),
      n("a2", "A2", "a", 1, { status: "LEARNING" }),
    ];
    expect(findNextNode(nodes)?.id).toBe("a2");
  });

  it("returns the first not-started leaf in tree order by default", () => {
    const nodes = [
      n("a", "A", null, 0),
      n("a1", "A1", "a", 0, { status: "COMPLETED" }),
      n("a2", "A2", "a", 1),
      n("b", "B", null, 1),
    ];
    expect(findNextNode(nodes)?.id).toBe("a2");
  });

  it("never returns a node that has children", () => {
    const nodes = [n("a", "A", null, 0), n("a1", "A1", "a", 0)];
    expect(findNextNode(nodes)?.id).toBe("a1");
  });

  it("returns null when every leaf is completed", () => {
    const nodes = [
      n("a", "A", null, 0),
      n("a1", "A1", "a", 0, { status: "COMPLETED" }),
    ];
    expect(findNextNode(nodes)).toBeNull();
  });

  it("prefers the earliest marked node when several are learning", () => {
    const nodes = [
      n("a", "A", null, 0, { status: "LEARNING" }),
      n("b", "B", null, 1, { status: "LEARNING" }),
    ];
    expect(findNextNode(nodes)?.id).toBe("a");
  });

  it("handles empty input", () => {
    expect(findNextNode([])).toBeNull();
  });
});

describe("nodePathTitles", () => {
  it("returns ancestor titles from root to direct parent", () => {
    const nodes = [
      n("a", "第一章", null, 0),
      n("a1", "第一节", "a", 0),
      n("a1x", "细胞", "a1", 0),
    ];
    expect(nodePathTitles(nodes, "a1x")).toEqual(["第一章", "第一节"]);
  });

  it("returns an empty array for a root node", () => {
    expect(nodePathTitles([n("a", "第一章", null, 0)], "a")).toEqual([]);
  });

  it("stops safely on a broken parent chain", () => {
    expect(nodePathTitles([n("x", "X", "ghost", 0)], "x")).toEqual([]);
  });

  it("returns an empty array for an unknown id", () => {
    expect(nodePathTitles([], "nope")).toEqual([]);
  });
});

describe("calcNodeStats", () => {
  it("counts leaves, completed leaves and notes", () => {
    const nodes = [
      n("a", "A", null, 0, { note: "父节点笔记" }),
      n("a1", "A1", "a", 0, { status: "COMPLETED" }),
      n("a2", "A2", "a", 1, { status: "COMPLETED", note: "有笔记" }),
      n("b", "B", null, 1),
    ];
    const s = calcNodeStats(nodes);
    expect(s.total).toBe(4);
    expect(s.leaves).toBe(3);
    expect(s.completedLeaves).toBe(2);
    expect(s.withNote).toBe(2);
  });

  it("handles empty input", () => {
    expect(calcNodeStats([])).toEqual({
      total: 0,
      leaves: 0,
      completedLeaves: 0,
      withNote: 0,
    });
  });
});

describe("buildContinueItems", () => {
  const subjects = [
    { id: "s1", name: "数学", color: "#111" },
    { id: "s2", name: "物理", color: "#222" },
    { id: "s3", name: "空学科", color: "#333" },
  ];

  it("builds one item per subject that still has something to study", () => {
    const nodes = [
      { ...n("a", "第一章", null, 0), subjectId: "s1" },
      { ...n("a1", "第一节", "a", 0, { note: "要点" }), subjectId: "s1" },
      { ...n("p", "力学", null, 0), subjectId: "s2" },
    ];
    const items = buildContinueItems(subjects, nodes);
    expect(items.map((i) => i.subjectId)).toEqual(["s1", "s2"]);
    expect(items[0].nodeId).toBe("a1");
    expect(items[0].pathTitles).toEqual(["第一章"]);
    expect(items[0].note).toBe("要点");
    expect(items[0].explicit).toBe(false);
    expect(items[0].subjectName).toBe("数学");
  });

  it("skips subjects that have nothing left", () => {
    const nodes = [
      { ...n("a", "第一章", null, 0), subjectId: "s1" },
      { ...n("a1", "第一节", "a", 0, { status: "COMPLETED" }), subjectId: "s1" },
    ];
    expect(buildContinueItems(subjects, nodes)).toEqual([]);
  });

  it("flags nodes the user explicitly marked as learning", () => {
    const nodes = [
      { ...n("a", "第一章", null, 0), subjectId: "s1" },
      { ...n("a1", "第一节", "a", 0), subjectId: "s1" },
      { ...n("a2", "第二节", "a", 1, { status: "LEARNING" }), subjectId: "s1" },
    ];
    const items = buildContinueItems(subjects, nodes);
    expect(items[0].nodeId).toBe("a2");
    expect(items[0].explicit).toBe(true);
  });

  it("ignores nodes belonging to unknown subjects", () => {
    const nodes = [{ ...n("z", "Z", null, 0), subjectId: "ghost" }];
    expect(buildContinueItems(subjects, nodes)).toEqual([]);
  });

  it("handles empty input", () => {
    expect(buildContinueItems([], [])).toEqual([]);
  });
});

describe("kindVisual", () => {
  it("gives chapters a bar and a bold title", () => {
    const v = kindVisual("chapter");
    expect(v.label).toBe("章");
    expect(v.bar).toBe(true);
    expect(v.dot).toBe(false);
    expect(v.titleClass).toContain("font-semibold");
  });

  it("gives sections medium weight and no marker", () => {
    const v = kindVisual("section");
    expect(v.label).toBe("节");
    expect(v.bar).toBe(false);
    expect(v.dot).toBe(false);
    expect(v.titleClass).toContain("font-medium");
  });

  it("gives points a leading dot", () => {
    const v = kindVisual("point");
    expect(v.label).toBe("点");
    expect(v.dot).toBe(true);
    expect(v.bar).toBe(false);
  });

  it("falls back to point styling for unknown or empty kinds", () => {
    for (const k of ["", "whatever", "POINT"]) {
      const v = kindVisual(k);
      expect(v.label).toBe("点");
      expect(v.dot).toBe(true);
    }
  });

  it("never marks two kinds with the same marker combination", () => {
    const seen = ["chapter", "section", "point"].map((k) => {
      const v = kindVisual(k);
      return `${v.bar}|${v.dot}|${v.titleClass}`;
    });
    expect(new Set(seen).size).toBe(3);
  });
});
