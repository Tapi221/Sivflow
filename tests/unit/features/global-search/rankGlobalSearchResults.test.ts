import { describe, expect, it } from "vitest";
import { rankSearchResults } from "@/features/search/lib/rankSearchResults";
import type { SearchItem } from "@/features/search/model/searchTypes";

const createSearchItem = (
  overrides: Partial<SearchItem>,
): SearchItem => {
  return {
    id: overrides.id ?? "item",
    value: overrides.value ?? "item",
    kind: overrides.kind ?? "document",
    title: overrides.title ?? "Untitled",
    keywords: overrides.keywords ?? [],
    onSelect: overrides.onSelect ?? (() => {}),
    subtitle: overrides.subtitle,
    timestampValue: overrides.timestampValue,
    priority: overrides.priority,
    iconKind: overrides.iconKind,
  };
};

describe("rankSearchResults", () => {
  it("query が空の場合は最近の項目を先に返す", () => {
    const recent = createSearchItem({
      id: "recent",
      value: "recent",
      title: "Recent",
      timestampValue: Date.now(),
    });
    const older = createSearchItem({
      id: "older",
      value: "older",
      title: "Older",
      timestampValue: Date.now() - 10 * 24 * 60 * 60 * 1000,
    });

    const results = rankSearchResults({
      items: [older, recent],
      query: "",
      limit: 10,
    });

    expect(results.map((item) => item.id)).toEqual(["recent", "older"]);
  });

  it("ゆるいキーワード一致より完全一致と前方一致のタイトルを優先する", () => {
    const exact = createSearchItem({
      id: "exact",
      value: "exact",
      title: "FlashCard Master",
      keywords: ["workspace"],
    });
    const prefix = createSearchItem({
      id: "prefix",
      value: "prefix",
      title: "FlashCard Notes",
      keywords: ["notes"],
    });
    const keywordOnly = createSearchItem({
      id: "keyword",
      value: "keyword",
      title: "Study",
      keywords: ["flashcard master"],
    });

    const results = rankSearchResults({
      items: [keywordOnly, prefix, exact],
      query: "flashcard master",
      limit: 10,
    });

    expect(results.map((item) => item.id)).toEqual([
      "exact",
      "prefix",
      "keyword",
    ]);
  });
});
