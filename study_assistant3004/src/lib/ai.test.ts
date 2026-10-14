import { describe, expect, it } from "vitest";
import {
  buildPrompt,
  buildRuleRecommendation,
  extractJson,
  masteryLabel,
  MAX_ADVICE_ITEMS,
  rankAdvice,
  selectUsableImages,
  validateAdvice,
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

describe("buildRuleRecommendation", () => {
  it("maps focus nodes to ranked items", () => {
    const r = buildRuleRecommendation({
      nodes: [
        {
          id: "n1",
          title: "中值定理",
          subjectName: "高等数学",
          status: "LEARNING",
          note: "",
        },
      ],
    });
    expect(r.items).toHaveLength(1);
    expect(r.items[0].nodeId).toBe("n1");
    expect(r.items[0].title).toBe("中值定理");
    expect(r.items[0].reason).toContain("高等数学");
    expect(r.items[0].reason).toContain("学习中");
  });

  it("puts a node without notes ahead of one that has notes", () => {
    const r = buildRuleRecommendation({
      nodes: [
        {
          id: "a",
          title: "有笔记",
          subjectName: "S",
          status: "NOT_STARTED",
          note: "写了点什么",
        },
        {
          id: "b",
          title: "无笔记",
          subjectName: "S",
          status: "NOT_STARTED",
          note: "",
        },
      ],
    });
    expect(r.items[0].nodeId).toBe("b");
    expect(r.items[0].mastery).toBe(0);
    expect(r.items[1].mastery).toBe(1);
  });

  it("marks nodes that have no note yet", () => {
    const r = buildRuleRecommendation({
      nodes: [
        {
          id: "n1",
          title: "微管",
          subjectName: "细胞生物学",
          status: "NOT_STARTED",
          note: "",
        },
      ],
    });
    expect(r.items[0].reason).toContain("尚无笔记");
  });

  it("omits the no-note hint when a note exists", () => {
    const r = buildRuleRecommendation({
      nodes: [
        {
          id: "n1",
          title: "微管",
          subjectName: "细胞生物学",
          status: "NOT_STARTED",
          note: "由微管蛋白二聚体组成",
        },
      ],
    });
    expect(r.items[0].reason).not.toContain("尚无笔记");
  });

  it("caps the list at the shared maximum", () => {
    const nodes = Array.from({ length: 20 }, (_, i) => ({
      id: `n${i}`,
      title: `节点${i}`,
      subjectName: "测试",
      status: "NOT_STARTED" as const,
      note: "",
    }));
    expect(buildRuleRecommendation({ nodes }).items).toHaveLength(
      MAX_ADVICE_ITEMS,
    );
  });

  it("returns an empty list when there is nothing to push", () => {
    expect(buildRuleRecommendation({ nodes: [] }).items).toEqual([]);
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

describe("buildPrompt", () => {
  it("lists the focus nodes", () => {
    const p = buildPrompt({
      nodes: [
        {
          id: "n1",
          title: "微管",
          subjectName: "细胞生物学",
          status: "LEARNING",
          note: "",
        },
      ],
    });
    expect(p).toContain("微管");
    expect(p).toContain("细胞生物学");
  });

  it("omits every optional section when there is no data", () => {
    const p = buildPrompt({ nodes: [] });
    expect(p).not.toContain("他已经写下的");
    expect(p).not.toContain("随附");
    expect(p).not.toContain("打卡记录");
    expect(p).not.toContain("复盘记录");
  });

  it("includes note samples as background", () => {
    const p = buildPrompt({
      nodes: [],
      noteSamples: [{ title: "微管", note: "由微管蛋白二聚体组成" }],
    });
    expect(p).toContain("笔记");
    expect(p).toContain("微管");
    expect(p).toContain("由微管蛋白二聚体组成");
  });

  it("includes image file names", () => {
    const p = buildPrompt({ nodes: [], imageNames: ["RNA分类.jpg"] });
    expect(p).toContain("图片");
    expect(p).toContain("RNA分类.jpg");
  });

  it("includes check-in records", () => {
    const p = buildPrompt({
      nodes: [],
      checkIns: [
        {
          date: "2026-09-14",
          durationMinutes: 30,
          status: "PARTIAL",
          note: "看了细胞膜",
        },
      ],
    });
    expect(p).toContain("打卡");
    expect(p).toContain("2026-09-14");
    expect(p).toContain("30");
    expect(p).toContain("看了细胞膜");
  });

  it("includes review records", () => {
    const p = buildPrompt({
      nodes: [],
      reviews: [
        {
          date: "2026-09-13",
          gain: "搞懂静息电位",
          question: "动作电位还没懂",
          difficulty: "离子通道",
          plan: "明天继续",
        },
      ],
    });
    expect(p).toContain("复盘");
    expect(p).toContain("搞懂静息电位");
    expect(p).toContain("动作电位还没懂");
  });

  it("combines all sources when everything is present", () => {
    const p = buildPrompt({
      subjectName: "人体结构与功能",
      nodes: [
        {
          id: "n1",
          title: "微管",
          subjectName: "人体结构与功能",
          status: "NOT_STARTED",
          note: "",
        },
      ],
      noteSamples: [{ title: "线粒体", note: "能量工厂" }],
      imageNames: ["a.jpg"],
      checkIns: [
        { date: "2026-09-14", durationMinutes: 30, status: "PARTIAL", note: "n" },
      ],
      reviews: [
        { date: "2026-09-13", gain: "g", question: "q", difficulty: "d", plan: "p" },
      ],
    });
    for (const kw of ["人体结构与功能", "微管", "能量工厂", "a.jpg", "打卡", "复盘"]) {
      expect(p).toContain(kw);
    }
  });
});

describe("masteryLabel", () => {
  it("labels each level", () => {
    expect(masteryLabel(0)).toBe("未开始");
    expect(masteryLabel(2)).toBe("能复述");
    expect(masteryLabel(4)).toBe("能讲清");
  });

  it("returns a safe label for out-of-range values", () => {
    expect(masteryLabel(-1)).toBe("未知");
    expect(masteryLabel(5)).toBe("未知");
    expect(masteryLabel(Number.NaN)).toBe("未知");
  });
});

describe("rankAdvice", () => {
  const item = (nodeId: string, mastery: number) => ({
    nodeId,
    title: nodeId,
    mastery,
    reason: "",
  });

  it("puts the weakest node first", () => {
    const r = rankAdvice([item("a", 3), item("b", 0), item("c", 2)]);
    expect(r.map((i) => i.nodeId)).toEqual(["b", "c", "a"]);
  });

  it("keeps the original order when mastery ties", () => {
    const r = rankAdvice([item("a", 1), item("b", 1), item("c", 1)]);
    expect(r.map((i) => i.nodeId)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the input array", () => {
    const input = [item("a", 4), item("b", 0)];
    rankAdvice(input);
    expect(input.map((i) => i.nodeId)).toEqual(["a", "b"]);
  });
});

describe("validateAdvice", () => {
  const candidates = [
    { id: "n1", title: "微管" },
    { id: "n2", title: "线粒体" },
  ];

  it("accepts a well-formed payload and attaches the real title", () => {
    const r = validateAdvice(
      {
        summary: "先补细胞结构",
        items: [{ nodeId: "n1", mastery: 1, reason: "笔记很短" }],
      },
      candidates,
    );
    expect(r?.summary).toBe("先补细胞结构");
    expect(r?.items).toHaveLength(1);
    expect(r?.items[0].title).toBe("微管");
  });

  it("drops items with unknown node ids", () => {
    const r = validateAdvice(
      { summary: "", items: [{ nodeId: "ghost", mastery: 1, reason: "" }] },
      candidates,
    );
    expect(r?.items).toEqual([]);
  });

  it("drops out-of-range or non-integer mastery", () => {
    const r = validateAdvice(
      {
        summary: "",
        items: [
          { nodeId: "n1", mastery: 9, reason: "" },
          { nodeId: "n2", mastery: 1.5, reason: "" },
        ],
      },
      candidates,
    );
    expect(r?.items).toEqual([]);
  });

  it("keeps the good items when only some are bad", () => {
    const r = validateAdvice(
      {
        summary: "",
        items: [
          { nodeId: "n1", mastery: 2, reason: "ok" },
          { nodeId: "ghost", mastery: 2, reason: "bad" },
          { nodeId: "n2", mastery: 99, reason: "bad" },
        ],
      },
      candidates,
    );
    expect(r?.items.map((i) => i.nodeId)).toEqual(["n1"]);
  });

  it("returns null for unusable payloads", () => {
    expect(validateAdvice(null, candidates)).toBeNull();
    expect(validateAdvice("nope", candidates)).toBeNull();
    expect(validateAdvice({}, candidates)).toBeNull();
    expect(validateAdvice({ summary: 1, items: [] }, candidates)).toBeNull();
    expect(validateAdvice({ summary: "x" }, candidates)).toBeNull();
  });

  it("dedupes repeated nodes, keeping the weakest reading", () => {
    const r = validateAdvice(
      {
        summary: "",
        items: [
          { nodeId: "n1", mastery: 3, reason: "偏乐观" },
          { nodeId: "n1", mastery: 0, reason: "更保守" },
        ],
      },
      candidates,
    );
    expect(r?.items).toHaveLength(1);
    expect(r?.items[0].mastery).toBe(0);
    expect(r?.items[0].reason).toBe("更保守");
  });

  it("caps how many items are kept", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `x${i}`,
      title: `T${i}`,
    }));
    const r = validateAdvice(
      {
        summary: "",
        items: many.map((m) => ({ nodeId: m.id, mastery: 1, reason: "" })),
      },
      many,
    );
    expect(r!.items.length).toBeLessThanOrEqual(8);
  });

  it("trims a blank summary but keeps the payload", () => {
    const r = validateAdvice({ summary: "   ", items: [] }, candidates);
    expect(r).not.toBeNull();
    expect(r?.summary).toBe("");
  });
});
