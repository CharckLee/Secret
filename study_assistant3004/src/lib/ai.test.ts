import { describe, expect, it } from "vitest";
import {
  buildRuleRecommendation,
  extractJson,
  parseAiRecommendation,
  selectUsableImages,
} from "./ai";

describe("extractJson", () => {
  it("parses plain JSON", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("extracts from markdown fence", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("extracts from surrounding text", () => {
    expect(extractJson('这里是说明 {"a":1} 结束')).toEqual({ a: 1 });
  });

  it("returns null for invalid input", () => {
    expect(extractJson("no json here")).toBeNull();
  });
});

describe("parseAiRecommendation", () => {
  it("parses weak points structure", () => {
    const r = parseAiRecommendation(
      JSON.stringify({
        summary: "整体薄弱点集中在积分",
        weakPoints: [
          { title: "定积分", summary: "计算不熟练", method: "多做题" },
          { title: "级数", summary: "概念模糊" },
        ],
      }),
    );
    expect(r?.summary).toBe("整体薄弱点集中在积分");
    expect(r?.weakPoints).toHaveLength(2);
    expect(r?.weakPoints[0]).toEqual({
      title: "定积分",
      summary: "计算不熟练",
      method: "多做题",
    });
    expect(r?.weakPoints[1].method).toBe("");
  });

  it("defaults missing fields", () => {
    const r = parseAiRecommendation(JSON.stringify({}));
    expect(r?.summary).toBe("");
    expect(r?.weakPoints).toEqual([]);
  });

  it("returns null for non-object json", () => {
    expect(parseAiRecommendation("[1,2,3]")).toBeNull();
  });

  it("filters weak points without title", () => {
    const r = parseAiRecommendation(
      JSON.stringify({
        summary: "s",
        weakPoints: [{ title: "有效", summary: "a" }, { summary: "无标题" }],
      }),
    );
    expect(r?.weakPoints).toHaveLength(1);
    expect(r?.weakPoints[0].title).toBe("有效");
  });
});

describe("buildRuleRecommendation", () => {
  it("maps focus nodes to suggestions", () => {
    const r = buildRuleRecommendation({
      nodes: [
        {
          title: "中值定理",
          subjectName: "高等数学",
          status: "LEARNING",
          note: "",
        },
      ],
    });
    expect(r.weakPoints).toHaveLength(1);
    expect(r.weakPoints[0].title).toBe("中值定理");
    expect(r.weakPoints[0].summary).toContain("高等数学");
    expect(r.weakPoints[0].summary).toContain("学习中");
  });

  it("marks nodes that have no note yet", () => {
    const r = buildRuleRecommendation({
      nodes: [
        {
          title: "微管",
          subjectName: "细胞生物学",
          status: "NOT_STARTED",
          note: "",
        },
      ],
    });
    expect(r.weakPoints[0].summary).toContain("尚无笔记");
  });

  it("omits the no-note hint when a note exists", () => {
    const r = buildRuleRecommendation({
      nodes: [
        {
          title: "微管",
          subjectName: "细胞生物学",
          status: "NOT_STARTED",
          note: "由微管蛋白二聚体组成",
        },
      ],
    });
    expect(r.weakPoints[0].summary).not.toContain("尚无笔记");
  });

  it("caps the list at 5 items", () => {
    const nodes = Array.from({ length: 8 }, (_, i) => ({
      title: `节点${i}`,
      subjectName: "测试",
      status: "NOT_STARTED" as const,
      note: "",
    }));
    expect(buildRuleRecommendation({ nodes }).weakPoints).toHaveLength(5);
  });

  it("returns empty list when there is nothing to push", () => {
    expect(buildRuleRecommendation({ nodes: [] }).weakPoints).toEqual([]);
  });
});

describe("selectUsableImages", () => {
  it("keeps only images", () => {
    const r = selectUsableImages([
      { filename: "a.jpg", mimeType: "image/jpeg", size: 1000 },
      { filename: "b.pdf", mimeType: "application/pdf", size: 1000 },
      { filename: "c.txt", mimeType: "text/plain", size: 10 },
    ]);
    expect(r.map((f) => f.filename)).toEqual(["a.jpg"]);
  });

  it("drops images over the per-image size limit", () => {
    const r = selectUsableImages(
      [
        { filename: "small.jpg", mimeType: "image/jpeg", size: 1000 },
        { filename: "huge.jpg", mimeType: "image/jpeg", size: 5_000_000 },
      ],
      { maxBytes: 2_000_000 },
    );
    expect(r.map((f) => f.filename)).toEqual(["small.jpg"]);
  });

  it("caps how many images are sent", () => {
    const files = Array.from({ length: 6 }, (_, i) => ({
      filename: `img${i}.jpg`,
      mimeType: "image/jpeg",
      size: 1000,
    }));
    expect(selectUsableImages(files, { maxCount: 3 })).toHaveLength(3);
  });

  it("preserves the incoming order", () => {
    const r = selectUsableImages([
      { filename: "b.jpg", mimeType: "image/jpeg", size: 1 },
      { filename: "a.jpg", mimeType: "image/jpeg", size: 1 },
    ]);
    expect(r.map((f) => f.filename)).toEqual(["b.jpg", "a.jpg"]);
  });

  it("returns an empty list for empty input", () => {
    expect(selectUsableImages([])).toEqual([]);
  });
});
