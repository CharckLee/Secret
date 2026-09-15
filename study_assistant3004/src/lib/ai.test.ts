import { describe, expect, it } from "vitest";
import { buildRuleRecommendation, extractJson, parseAiRecommendation } from "./ai";

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
  it("maps weak points to suggestion", () => {
    const r = buildRuleRecommendation({
      weakPoints: [
        {
          title: "中值定理",
          subjectName: "高等数学",
          stage: "LEARNING",
          difficulty: "HARD",
        },
      ],
    });
    expect(r.weakPoints).toHaveLength(1);
    expect(r.weakPoints[0].title).toBe("中值定理");
    expect(r.weakPoints[0].summary).toContain("高等数学");
    expect(r.weakPoints[0].summary).toContain("学习中");
  });
});
