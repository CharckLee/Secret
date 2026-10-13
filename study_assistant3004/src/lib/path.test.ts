import { describe, expect, it } from "vitest";
import { groupNodesBySubject } from "./path";

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
