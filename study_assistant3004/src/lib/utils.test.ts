import { describe, expect, it } from "vitest";
import { mergeFileKeys, normalizeIds } from "./utils";

describe("normalizeIds", () => {
  it("returns empty for non-array input", () => {
    expect(normalizeIds(null)).toEqual([]);
    expect(normalizeIds("abc")).toEqual([]);
    expect(normalizeIds({ 0: "a" })).toEqual([]);
  });

  it("drops non-string, empty and blank entries and trims the rest", () => {
    expect(normalizeIds(["a", "", "   ", 1, null, " b "])).toEqual(["a", "b"]);
  });

  it("dedupes keeping the first occurrence order", () => {
    expect(normalizeIds(["b", "a", "b"])).toEqual(["b", "a"]);
  });

  it("caps the result at the given limit", () => {
    expect(normalizeIds(["a", "b", "c"], 2)).toEqual(["a", "b"]);
  });
});

describe("mergeFileKeys", () => {
  it("appends new files", () => {
    const a = { name: "a.jpg", size: 1 };
    const b = { name: "b.jpg", size: 2 };
    expect(mergeFileKeys([a], [b])).toEqual([a, b]);
  });

  it("skips a file already present (same name and size)", () => {
    const a = { name: "a.jpg", size: 1 };
    expect(mergeFileKeys([a], [{ name: "a.jpg", size: 1 }])).toEqual([a]);
  });

  it("keeps files sharing a name but differing in size", () => {
    const r = mergeFileKeys(
      [{ name: "a.jpg", size: 1 }],
      [{ name: "a.jpg", size: 2 }],
    );
    expect(r).toHaveLength(2);
  });

  it("dedupes inside the incoming batch too", () => {
    const r = mergeFileKeys(
      [],
      [
        { name: "a.jpg", size: 1 },
        { name: "a.jpg", size: 1 },
      ],
    );
    expect(r).toHaveLength(1);
  });

  it("caps the total count", () => {
    const existing = Array.from({ length: 3 }, (_, i) => ({
      name: `e${i}`,
      size: 1,
    }));
    const incoming = Array.from({ length: 5 }, (_, i) => ({
      name: `i${i}`,
      size: 1,
    }));
    expect(mergeFileKeys(existing, incoming, 4)).toHaveLength(4);
  });

  it("returns the existing list when nothing comes in", () => {
    const existing = [{ name: "a.jpg", size: 1 }];
    expect(mergeFileKeys(existing, [])).toEqual(existing);
  });
});
