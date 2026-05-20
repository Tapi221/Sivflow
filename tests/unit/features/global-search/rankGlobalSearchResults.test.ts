import { describe, expect, it } from "vitest";

import { rankGlobalSearchResults } from "@/features/global-search/lib/rankGlobalSearchResults";
import type { GlobalSearchItem } from "@/features/global-search/model/globalSearchTypes";

const createSearchItem = (
  overrides: Partial<GlobalSearchItem>,
): GlobalSearchItem => {
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

describe("rankGlobalSearchResults", () => {
  it("returns recent items first when query is empty", () => {
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

    const results = rankGlobalSearchResults({
      items: [older, recent],
      query: "",
      limit: 10,
    });

    expect(results.map((item) => item.id)).toEqual(["recent", "older"]);
  });

  it("prefers exact and prefix title matches over loose keyword matches", () => {
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

    const results = rankGlobalSearchResults({
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
