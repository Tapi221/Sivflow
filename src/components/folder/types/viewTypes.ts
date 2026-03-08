import type { Card } from "@/types";
import type { Tag } from "@/hooks/settings/useTags";

export type ViewKind = "folder" | "tagCategory" | "tagTree";

export type ViewDef = {
  id: string;
  name: string;
  kind: ViewKind;
  options?: {
    categoryMode?: "user-defined" | "none";
    scopeMode?: "all" | "selectedRoots" | "selectedTags" | "prefix";
    includedTagIds?: string[];
    rootTagIds?: string[];
    tagNamePrefix?: string;
    hideZeroUsage?: boolean;
    ungroupedLabel?: string;
  };
};

export type TreeNode =
  | { type: "group"; id: string; label: string; children: TreeNode[] }
  | { type: "card"; id: string; cardId: string };

const getCardTagIds = (card: Card): string[] =>
  Array.isArray(card.tagIds)
    ? card.tagIds.filter((id): id is string => typeof id === "string")
    : [];

const sortByName = <T extends { name: string }>(items: T[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name, "ja"));

const createCardNode = (card: Card): TreeNode => ({
  type: "card",
  id: `card:${card.id}`,
  cardId: card.id,
});

const buildChildrenMap = (tags: Tag[]): Map<string | null, Tag[]> => {
  const tagIds = new Set(tags.map((tag) => tag.id));
  const childrenMap = new Map<string | null, Tag[]>();
  for (const tag of tags) {
    const parentId =
      tag.parentId && tagIds.has(tag.parentId) ? tag.parentId : null;
    const siblings = childrenMap.get(parentId) ?? [];
    siblings.push(tag);
    childrenMap.set(parentId, siblings);
  }
  return childrenMap;
};

export function buildVirtualTree(
  view: ViewDef,
  cards: Card[],
  tags: Tag[],
  categoryNameById: Map<string, string>,
): TreeNode[] {
  const activeCards = cards.filter((card) => !card.isDeleted);

  if (view.kind === "tagTree") {
    const cardsByTagId = new Map<string, Card[]>();
    const scopeMode = view.options?.scopeMode ?? "all";
    const hideZeroUsage = view.options?.hideZeroUsage ?? true;
    const selectedTagIds = new Set(view.options?.includedTagIds ?? []);
    const selectedRootTagIds = new Set(view.options?.rootTagIds ?? []);
    const normalizedPrefix = (view.options?.tagNamePrefix ?? "")
      .trim()
      .toLowerCase();
    for (const card of activeCards) {
      for (const tagId of getCardTagIds(card)) {
        const taggedCards = cardsByTagId.get(tagId) ?? [];
        taggedCards.push(card);
        cardsByTagId.set(tagId, taggedCards);
      }
    }

    const isTagIncluded = (tag: Tag): boolean => {
      switch (scopeMode) {
        case "selectedTags":
          return selectedTagIds.has(tag.id);
        case "selectedRoots":
          return true;
        case "prefix":
          return (
            normalizedPrefix.length === 0 ||
            tag.nameLower.startsWith(normalizedPrefix)
          );
        case "all":
        default:
          return true;
      }
    };

    const initialScopedTags = tags.filter(isTagIncluded);
    const childrenMapForAll = buildChildrenMap(tags);

    const scopedTags =
      scopeMode === "selectedRoots"
        ? (() => {
            if (selectedRootTagIds.size === 0) return tags;
            const allowedIds = new Set<string>();
            const stack = Array.from(selectedRootTagIds);
            while (stack.length > 0) {
              const currentTagId = stack.pop();
              if (!currentTagId || allowedIds.has(currentTagId)) continue;
              allowedIds.add(currentTagId);
              const children = childrenMapForAll.get(currentTagId) ?? [];
              for (const child of children) {
                stack.push(child.id);
              }
            }
            return tags.filter((tag) => allowedIds.has(tag.id));
          })()
        : initialScopedTags;

    const childTagsByParentId = buildChildrenMap(scopedTags);
    const rootTags = childTagsByParentId.get(null) ?? [];

    const buildTagNode = (tag: Tag, visited: Set<string>): TreeNode | null => {
      if (visited.has(tag.id)) {
        return null;
      }
      const nextVisited = new Set(visited);
      nextVisited.add(tag.id);
      const childNodes = sortByName(childTagsByParentId.get(tag.id) ?? [])
        .map((child) => buildTagNode(child, nextVisited))
        .filter((node): node is TreeNode => node !== null);
      const cardNodes = (cardsByTagId.get(tag.id) ?? []).map(createCardNode);

      if (hideZeroUsage && cardNodes.length === 0 && childNodes.length === 0) {
        return null;
      }

      return {
        type: "group",
        id: `tag:${tag.id}`,
        label: tag.name,
        children: [...childNodes, ...cardNodes],
      };
    };

    return sortByName(rootTags)
      .map((tag) => buildTagNode(tag, new Set<string>()))
      .filter((node): node is TreeNode => node !== null);
  }

  const ungroupedLabel = view.options?.ungroupedLabel?.trim() || "未分類";
  const tagsByCategoryId = new Map<string, Tag[]>();
  const ungroupedTags: Tag[] = [];
  const cardsByTagId = new Map<string, Card[]>();

  for (const tag of tags) {
    const categoryId = typeof tag.categoryId === "string" ? tag.categoryId : "";
    if (!categoryId) {
      ungroupedTags.push(tag);
      continue;
    }
    const siblings = tagsByCategoryId.get(categoryId) ?? [];
    siblings.push(tag);
    tagsByCategoryId.set(categoryId, siblings);
  }

  for (const card of activeCards) {
    for (const tagId of getCardTagIds(card)) {
      const taggedCards = cardsByTagId.get(tagId) ?? [];
      taggedCards.push(card);
      cardsByTagId.set(tagId, taggedCards);
    }
  }

  const categoryNodes: TreeNode[] = Array.from(tagsByCategoryId.entries())
    .sort(([leftId], [rightId]) => {
      const leftLabel = categoryNameById.get(leftId) ?? leftId;
      const rightLabel = categoryNameById.get(rightId) ?? rightId;
      return leftLabel.localeCompare(rightLabel, "ja");
    })
    .map(([categoryId, categoryTags]) => ({
      type: "group",
      id: `category:${categoryId}`,
      label: categoryNameById.get(categoryId)?.trim() || categoryId,
      children: sortByName(categoryTags).map((tag) => ({
        type: "group",
        id: `tag:${tag.id}`,
        label: tag.name,
        children: (cardsByTagId.get(tag.id) ?? []).map(createCardNode),
      })),
    }));

  if (ungroupedTags.length > 0) {
    categoryNodes.push({
      type: "group",
      id: "category:ungrouped",
      label: ungroupedLabel,
      children: sortByName(ungroupedTags).map((tag) => ({
        type: "group",
        id: `tag:${tag.id}`,
        label: tag.name,
        children: (cardsByTagId.get(tag.id) ?? []).map(createCardNode),
      })),
    });
  }

  return categoryNodes;
}





