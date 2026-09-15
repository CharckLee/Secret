import { describe, expect, it } from "vitest";
import { diffRemovedIds, normalizeIds } from "./utils";

describe("diffRemovedIds", () => {
  it("returns ids present before but missing after", () => {
    expect(diffRemovedIds(["a", "b", "c"], ["a"])).toEqual(["b", "c"]);
  });

  it("returns empty when nothing was removed", () => {
    expect(diffRemovedIds(["a"], ["a", "b"])).toEqual([]);
  });

  it("returns empty for two empty lists", () => {
    expect(diffRemovedIds([], [])).toEqual([]);
  });

  it("returns everything when the next list is empty", () => {
    expect(diffRemovedIds(["a", "b"], [])).toEqual(["a", "b"]);
  });

  it("ignores duplicates on both sides", () => {
    expect(diffRemovedIds(["a", "a", "b"], ["b"])).toEqual(["a"]);
  });
});

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
