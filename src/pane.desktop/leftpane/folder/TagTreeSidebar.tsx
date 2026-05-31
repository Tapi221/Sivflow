import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { getTagColorSwatchStyle } from "@/chip/tag/tagColor";
import { useCardsRead } from "@/components/card/hooks/useCardsRead";
import { useTags, type Tag as TagRecord } from "@/features/settings/hooks/useTags";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { cn } from "@/lib/utils";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import type { Card } from "@/types";

type TagTreeNode = {
  id: string;
  name: string;
  color: string | null;
  parentId: string | null;
  children: TagTreeNode[];
};

type VisibleTagTreeNode = {
  id: string;
  name: string;
  color: string | null;
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
};

type TagTreeRowProps = {
  item: VisibleTagTreeNode;
  selectedTagNames: Set<string>;
  tagContentCountById: Map<string, number>;
  onToggleTag: (tagId: string) => void;
  onSelectTag: (tagName: string) => void;
};

const LIBRARY_TITLE = "Library";
const ROOT_LEVEL = 1;

const IconChevronRight = ({ className }: { className?: string }) => (<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>);

const IconTag = ({ className }: { className?: string }) => (<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M3.5 5.5V9.4c0 .4.16.78.44 1.06l5.6 5.6a1.5 1.5 0 0 0 2.12 0l4.4-4.4a1.5 1.5 0 0 0 0-2.12l-5.6-5.6A1.5 1.5 0 0 0 9.4 3.5H5.5a2 2 0 0 0-2 2Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" /><circle cx="7" cy="7" r="1.1" fill="currentColor" /></svg>);

const getTagName = (tag: TagRecord): string => {
  const name = tag.name.trim();
  return name.length > 0 ? name : "無題のタグ";
};

const getTagParentId = (tag: TagRecord): string | null => typeof tag.parentId === "string" && tag.parentId.trim().length > 0 ? tag.parentId : null;

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
};

const getCardTagIds = (card: Card): string[] => {
  const record = card as Card & { tag_ids?: unknown };
  return asStringArray(record.tagIds ?? record.tag_ids);
};

const sortTagTreeNodes = (nodes: TagTreeNode[]): TagTreeNode[] => nodes.sort((left, right) => left.name.localeCompare(right.name, "ja"));

const buildTagTreeNodes = (tags: TagRecord[]): TagTreeNode[] => {
  const nodeById = new Map<string, TagTreeNode>();

  tags.forEach((tag) => {
    nodeById.set(tag.id, { id: tag.id, name: getTagName(tag), color: tag.color ?? null, parentId: getTagParentId(tag), children: [] });
  });

  const roots: TagTreeNode[] = [];

  nodeById.forEach((node) => {
    const parent = node.parentId && node.parentId !== node.id ? nodeById.get(node.parentId) : null;
    if (parent) {
      parent.children.push(node);
      return;
    }

    node.parentId = null;
    roots.push(node);
  });

  nodeById.forEach((node) => {
    sortTagTreeNodes(node.children);
  });

  return sortTagTreeNodes(roots);
};

const getRootTagIds = (nodes: TagTreeNode[]): string[] => nodes.map((node) => node.id);

const flattenVisibleTagTree = (nodes: TagTreeNode[], expandedTagIds: Set<string>, level = ROOT_LEVEL, visitedTagIds = new Set<string>()): VisibleTagTreeNode[] => nodes.flatMap((node) => {
  if (visitedTagIds.has(node.id)) return [];

  const hasChildren = node.children.length > 0;
  const isExpanded = expandedTagIds.has(node.id);
  const nextVisitedTagIds = new Set(visitedTagIds).add(node.id);
  const item: VisibleTagTreeNode = { id: node.id, name: node.name, color: node.color, level, hasChildren, isExpanded };

  if (!hasChildren || !isExpanded) return [item];

  return [item, ...flattenVisibleTagTree(node.children, expandedTagIds, level + 1, nextVisitedTagIds)];
});

const buildTagChildrenMap = (tags: TagRecord[]): Map<string, string[]> => {
  const tagIdSet = new Set(tags.map((tag) => tag.id));
  const childrenByParentId = new Map<string, string[]>();

  tags.forEach((tag) => {
    const parentId = getTagParentId(tag);
    if (!parentId || !tagIdSet.has(parentId) || parentId === tag.id) return;

    const children = childrenByParentId.get(parentId) ?? [];
    children.push(tag.id);
    childrenByParentId.set(parentId, children);
  });

  return childrenByParentId;
};

const buildTagContentCountById = (tags: TagRecord[], cards: Card[]): Map<string, number> => {
  const directCountById = new Map<string, number>();
  const childrenByParentId = buildTagChildrenMap(tags);

  cards.forEach((card) => {
    getCardTagIds(card).forEach((tagId) => {
      directCountById.set(tagId, (directCountById.get(tagId) ?? 0) + 1);
    });
  });

  const totalCountById = new Map<string, number>();
  const getTotalCount = (tagId: string, visitedTagIds = new Set<string>()): number => {
    if (visitedTagIds.has(tagId)) return 0;
    if (totalCountById.has(tagId)) return totalCountById.get(tagId) ?? 0;

    const nextVisitedTagIds = new Set(visitedTagIds).add(tagId);
    const childCount = (childrenByParentId.get(tagId) ?? []).reduce((total, childTagId) => total + getTotalCount(childTagId, nextVisitedTagIds), 0);
    const totalCount = (directCountById.get(tagId) ?? 0) + childCount;

    totalCountById.set(tagId, totalCount);
    return totalCount;
  };

  tags.forEach((tag) => {
    getTotalCount(tag.id);
  });

  return totalCountById;
};

const TagTreeRow = ({ item, selectedTagNames, tagContentCountById, onToggleTag, onSelectTag }: TagTreeRowProps) => {
  const isSelected = selectedTagNames.has(item.name);
  const contentCount = tagContentCountById.get(item.id) ?? 0;
  const rowPaddingLeft = Math.max(0, item.level - ROOT_LEVEL) * 12;
  const markerStyle = getTagColorSwatchStyle(item.color ?? undefined);

  const handleToggleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!item.hasChildren) return;
    onToggleTag(item.id);
  };

  const handleRowClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onSelectTag(item.name);
    if (item.hasChildren && !item.isExpanded) onToggleTag(item.id);
  };

  return <div data-tag-id={item.id}><div role="treeitem" aria-level={item.level} aria-expanded={item.hasChildren ? item.isExpanded : undefined} aria-selected={isSelected} className={cn("flex h-7 items-center gap-1 rounded-[10px] pr-2 text-[12px] font-medium text-[#6d7380]", isSelected && "bg-[#f4f4f5]")} style={{ paddingLeft: rowPaddingLeft }}><button type="button" onClick={handleToggleClick} aria-label={item.isExpanded ? `${item.name} を閉じる` : `${item.name} を開く`} aria-disabled={!item.hasChildren} disabled={!item.hasChildren} className="library-tree-marker" style={markerStyle}><IconChevronRight className={cn("h-3 w-3 transition-transform", item.hasChildren ? "opacity-100" : "opacity-0", item.isExpanded && "rotate-90")} /></button><button type="button" onClick={handleRowClick} title={item.name} className="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-[10px] text-left text-inherit hover:bg-[#f7f7f8]"><IconTag className="h-4 w-4 shrink-0 text-[#9aa1ad]" /><span className="min-w-0 flex-1 truncate">{item.name}</span>{contentCount > 0 ? <span className="shrink-0 rounded-full bg-[#eef1f4] px-1.5 py-0.5 text-[10px] font-bold text-[#8b929e]">{contentCount}</span> : null}</button></div></div>;
};

const TagTreeSidebar = () => {
  const { tags } = useTags();
  const { cards, loading, error } = useCardsRead();
  const tagFilter = useExplorerStore((state) => state.tagFilter);
  const setTagFilter = useExplorerStore((state) => state.setTagFilter);
  const clearTagFilter = useExplorerStore((state) => state.clearTagFilter);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const tagTreeNodes = useMemo(() => buildTagTreeNodes(tags), [tags]);
  const tagContentCountById = useMemo(() => buildTagContentCountById(tags, cards), [cards, tags]);
  const selectedTagNames = useMemo(() => new Set(tagFilter), [tagFilter]);
  const [expandedTagIds, setExpandedTagIds] = useState<Set<string>>(() => new Set(getRootTagIds(tagTreeNodes)));

  useEffect(() => {
    const rootTagIds = getRootTagIds(tagTreeNodes);
    if (rootTagIds.length === 0) return;

    setExpandedTagIds((current) => {
      const next = new Set(current);
      let didChange = false;
      rootTagIds.forEach((tagId) => {
        if (next.has(tagId)) return;
        next.add(tagId);
        didChange = true;
      });
      return didChange ? next : current;
    });
  }, [tagTreeNodes]);

  const visibleTagItems = useMemo(() => flattenVisibleTagTree(tagTreeNodes, expandedTagIds), [expandedTagIds, tagTreeNodes]);

  const handleToggleTag = useCallback((tagId: string) => {
    setExpandedTagIds((current) => {
      const next = new Set(current);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }, []);

  const handleSelectTag = useCallback((tagName: string) => {
    if (tagFilter.length === 1 && tagFilter[0] === tagName) clearTagFilter();
    else setTagFilter([tagName]);

    openExplorerTab({ title: LIBRARY_TITLE, explorerState: { isHomeOnlyMode: false, isSectionListMode: true, selectedFolderId: null, selectedItem: null } });
  }, [clearTagFilter, openExplorerTab, setTagFilter, tagFilter]);

  if (loading) return <aside aria-label="Tag tree explorer" className="h-full min-h-0 overflow-y-auto px-2 py-1 text-[12px] text-[#9aa1ad]">読み込み中...</aside>;
  if (error) return <aside aria-label="Tag tree explorer" className="h-full min-h-0 overflow-y-auto px-2 py-1 text-[12px] text-[#b48a8a]">{error}</aside>;

  return <aside aria-label="Tag tree explorer" className="h-full min-h-0 overflow-hidden"><div className="h-full min-h-0 overflow-y-auto px-2 pb-2 pt-1"><div role="tree" aria-label="タグツリー" className="flex flex-col gap-0.5">{visibleTagItems.length > 0 ? visibleTagItems.map((item) => <TagTreeRow key={item.id} item={item} selectedTagNames={selectedTagNames} tagContentCountById={tagContentCountById} onToggleTag={handleToggleTag} onSelectTag={handleSelectTag} />) : <p className="px-2 py-2 text-[12px] font-medium text-[#9aa1ad]">タグがありません</p>}</div></div></aside>;
};

export { TagTreeSidebar };
