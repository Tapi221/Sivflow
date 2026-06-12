import type { SearchItem } from "@/features/search/model/search.types";
import { toMillis } from "@/utils/toMillis";



type RankSearchResultsParams = {
  items: SearchItem[];
  query: string;
  limit?: number;
};
type RankedSearchItem = {
  item: SearchItem;
  score: number;
  timestampMillis: number;
};



const normalizeText = (value: string) => {
  return value.normalize("NFKC").trim().toLocaleLowerCase("ja-JP");
};
const splitQueryTokens = (value: string) => {
  return normalizeText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
};
const buildSearchHaystack = (item: SearchItem) => {
  return normalizeText(
    [item.title, item.subtitle ?? "", ...item.keywords]
      .filter(Boolean)
      .join(" "),
  );
};
const buildKeywordSet = (item: SearchItem) => {
  return item.keywords.map((keyword) => normalizeText(keyword)).filter(Boolean);
};
const scoreRecentness = (timestampMillis: number) => {
  if (timestampMillis <= 0) {
    return 0;
  }

  const ageInMs = Date.now() - timestampMillis;
  const day = 24 * 60 * 60 * 1000;

  if (ageInMs <= day) {
    return 35;
  }

  if (ageInMs <= day * 3) {
    return 24;
  }

  if (ageInMs <= day * 7) {
    return 16;
  }

  if (ageInMs <= day * 30) {
    return 8;
  }

  return 0;
};
const compareRankedItems = (
  left: RankedSearchItem,
  right: RankedSearchItem,
) => {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  if (right.timestampMillis !== left.timestampMillis) {
    return right.timestampMillis - left.timestampMillis;
  }

  if ((right.item.priority ?? 0) !== (left.item.priority ?? 0)) {
    return (right.item.priority ?? 0) - (left.item.priority ?? 0);
  }

  return left.item.title.localeCompare(right.item.title, "ja-JP");
};
const rankItemForQuery = (
  item: SearchItem,
  normalizedQuery: string,
  tokens: string[],
): RankedSearchItem | null => {
  const normalizedTitle = normalizeText(item.title);
  const normalizedSubtitle = normalizeText(item.subtitle ?? "");
  const normalizedKeywords = buildKeywordSet(item);
  const haystack = buildSearchHaystack(item);

  if (!normalizedTitle && !haystack) {
    return null;
  }

  let score = 0;

  if (normalizedTitle === normalizedQuery) {
    score += 1500;
  } else if (
    normalizedKeywords.some((keyword) => keyword === normalizedQuery)
  ) {
    score += 1380;
  } else if (haystack === normalizedQuery) {
    score += 1320;
  }

  if (normalizedTitle.startsWith(normalizedQuery)) {
    score += 960;
  } else if (
    normalizedKeywords.some((keyword) => keyword.startsWith(normalizedQuery))
  ) {
    score += 860;
  } else if (normalizedSubtitle.startsWith(normalizedQuery)) {
    score += 760;
  }

  if (normalizedTitle.includes(normalizedQuery)) {
    score += 640;
  } else if (
    normalizedKeywords.some((keyword) => keyword.includes(normalizedQuery))
  ) {
    score += 560;
  } else if (haystack.includes(normalizedQuery)) {
    score += 420;
  }

  for (const token of tokens) {
    if (normalizedTitle.startsWith(token)) {
      score += 140;
      continue;
    }

    if (normalizedTitle.includes(token)) {
      score += 90;
      continue;
    }

    if (normalizedKeywords.some((keyword) => keyword.startsWith(token))) {
      score += 80;
      continue;
    }

    if (normalizedKeywords.some((keyword) => keyword.includes(token))) {
      score += 50;
      continue;
    }

    if (haystack.includes(token)) {
      score += 28;
      continue;
    }

    return null;
  }

  const timestampMillis = toMillis(item.timestampValue, 0);
  score += scoreRecentness(timestampMillis);
  score += item.priority ?? 0;

  if (score <= 0) {
    return null;
  }

  return {
    item,
    score,
    timestampMillis,
  };
};
const rankSearchResults = ({ items, query, limit = 24 }: RankSearchResultsParams) => {
  const normalizedQuery = normalizeText(query);
  const tokens = splitQueryTokens(query);

  if (!normalizedQuery) {
    return [...items]
      .sort((left, right) => {
        const leftTimestamp = toMillis(left.timestampValue, 0);
        const rightTimestamp = toMillis(right.timestampValue, 0);

        if (rightTimestamp !== leftTimestamp) {
          return rightTimestamp - leftTimestamp;
        }

        if ((right.priority ?? 0) !== (left.priority ?? 0)) {
          return (right.priority ?? 0) - (left.priority ?? 0);
        }

        return left.title.localeCompare(right.title, "ja-JP");
      })
      .slice(0, limit);
  }

  return items
    .map((item) => rankItemForQuery(item, normalizedQuery, tokens))
    .filter((item): item is RankedSearchItem => item !== null)
    .sort(compareRankedItems)
    .slice(0, limit)
    .map(({ item }) => item);
};



export { rankSearchResults };
