import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TagColorKey } from "@shared/design-tokens/color/Color.Tag";
import { TagBadge } from "@web-renderer/chip/budge/tag/Badge.Tag";
import { getTagColorKey } from "@web-renderer/chip/budge/tag/tagColor";
import { cn } from "@web-renderer/lib/utils";
import type { DragEvent as ReactDragEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { useExplorerStore } from "@/features/explorer/store/useExplorerStore";
import type { Tag as TagRecord } from "@/features/settings/hooks/useTags";
import { useTags } from "@/features/settings/hooks/useTags";
import { useTagTreeCommands } from "@/features/settings/hooks/useTagTreeCommands";
import { LayeredTreeDropIndicator } from "./layeredTreeDnd";
import { LAYERED_TREE_INDENT_PX, LAYERED_TREE_ROOT_DROP_INDICATOR_LEFT_PX, LAYERED_TREE_ROOT_LEVEL } from "./layeredTreeDnd.constants";
import type { LayeredTreeDragState } from "./layeredTreeDnd.types";
import { getLayeredTreeDropIndicatorLeft, isLayeredTreeAppendDropTarget } from "./layeredTreeDnd.utils";
import { useLayeredTreeDragDrop } from "./useLayeredTreeDragDrop";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";



type TagTreeNode = {
  id: string;
  name: string;
  colorKey: TagColorKey;
  parentId: string | null;
  orderIndex: number;
  children: TagTreeNode[];
};
type VisibleTagTreeNode = {
  id: string;
  name: string;
  colorKey: TagColorKey;
  parentId: string | null;
  orderIndex: number;
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
};
type TagTreeRowProps = {
  item: VisibleTagTreeNode;
  selectedTagNames: Set<string>;
  dragState: LayeredTreeDragState;
  onToggleTag: (tagId: string) => void;
  onSelectTag: (tagName: string) => void;
  onTagDragStart: (event: ReactDragEvent<HTMLElement>, tagId: string) => void;
  onTagDragOver: (event: ReactDragEvent<HTMLElement>, tagId: string) => void;
  onTagDragLeave: (event: ReactDragEvent<HTMLElement>, tagId: string) => void;
  onTagDrop: (event: ReactDragEvent<HTMLElement>, tagId: string) => void;
  onTagDragEnd: () => void;
};
type TagMovePatch = {
  parentId: string | null;
  orderIndex: number;
};



const LIBRARY_TITLE = "Library";
const EMPTY_TAG_MESSAGE = "タグがありません";



const getTagName = (tag: TagRecord): string => {
  const name = tag.name.trim();
  return name.length > 0 ? name : "無題のタグ";
};
const getTagParentId = (tag: TagRecord): string | null => typeof tag.parentId === "string" && tag.parentId.trim().length > 0 ? tag.parentId : null;
const getTagOrderIndex = (tag: TagRecord): number => typeof tag.orderIndex === "number" && Number.isFinite(tag.orderIndex) ? tag.orderIndex : 0;
const compareTagTreeNodes = (left: TagTreeNode, right: TagTreeNode): number => {
  if (left.orderIndex !== right.orderIndex) return left.orderIndex - right.orderIndex;
  return left.name.localeCompare(right.name, "ja");
};
const sortTagTreeNodes = (nodes: TagTreeNode[]): TagTreeNode[] => nodes.sort(compareTagTreeNodes);
const buildTagTreeNodes = (tags: TagRecord[]): TagTreeNode[] => {
  const nodeById = new Map<string, TagTreeNode>();
  tags.forEach((tag) => {
    nodeById.set(tag.id, {
      id: tag.id,
      name: getTagName(tag),
      colorKey: getTagColorKey(tag.color ?? undefined),
      parentId: getTagParentId(tag),
      orderIndex: getTagOrderIndex(tag),
      children: [],
    });
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
const createTagNodeMap = (nodes: TagTreeNode[]): Map<string, TagTreeNode> => {
  const map = new Map<string, TagTreeNode>();
  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || map.has(node.id)) continue;
    map.set(node.id, node);
    stack.push(...node.children);
  }
  return map;
};
const flattenVisibleTagTree = (nodes: TagTreeNode[], expandedTagIds: Set<string>, level = LAYERED_TREE_ROOT_LEVEL, visitedTagIds = new Set<string>()): VisibleTagTreeNode[] => nodes.flatMap((node) => {
  if (visitedTagIds.has(node.id)) return [];
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedTagIds.has(node.id);
  const nextVisitedTagIds = new Set(visitedTagIds).add(node.id);
  const item: VisibleTagTreeNode = {
    id: node.id,
    name: node.name,
    colorKey: node.colorKey,
    parentId: node.parentId,
    orderIndex: node.orderIndex,
    level,
    hasChildren,
    isExpanded,
  };
  if (!hasChildren || !isExpanded) return [item];
  return [item, ...flattenVisibleTagTree(node.children, expandedTagIds, level + 1, nextVisitedTagIds)];
});



const IconChevronRight = ({ className }: { className?: string; }) => (
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const TagTreeRow = ({ item, selectedTagNames, dragState, onToggleTag, onSelectTag, onTagDragStart, onTagDragOver, onTagDragLeave, onTagDrop, onTagDragEnd }: TagTreeRowProps) => {
  const isSelected = selectedTagNames.has(item.name);
  const isDragging = dragState.draggingId === item.id;
  const dropPosition = dragState.dropInstruction?.targetId === item.id ? dragState.dropInstruction.position : null;
  const rowPaddingLeft = Math.max(0, item.level - LAYERED_TREE_ROOT_LEVEL) * LAYERED_TREE_INDENT_PX;
  const dropIndicatorLeft = getLayeredTreeDropIndicatorLeft(item.level);
  const selectTag = () => {
    onSelectTag(item.name);
    if (item.hasChildren && !item.isExpanded) onToggleTag(item.id);
  };
  const handleToggleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (item.hasChildren) onToggleTag(item.id);
  };
  const handleRowClick = (event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    selectTag();
  };
  const handleRowKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    selectTag();
  };
  return (
    <div data-tag-id={item.id}>
      <div
        role="treeitem"
        tabIndex={0}
        aria-level={item.level}
        aria-expanded={item.hasChildren ? item.isExpanded : undefined}
        aria-selected={isSelected}
        aria-grabbed={isDragging || undefined}
        draggable
        data-layered-tree-row="true"
        onClick={handleRowClick}
        onKeyDown={handleRowKeyDown}
        onDragStart={(event) => onTagDragStart(event, item.id)}
        onDragEnter={(event) => onTagDragOver(event, item.id)}
        onDragOver={(event) => onTagDragOver(event, item.id)}
        onDragLeave={(event) => onTagDragLeave(event, item.id)}
        onDrop={(event) => onTagDrop(event, item.id)}
        onDragEnd={onTagDragEnd}
        data-tag-drop-position={dropPosition ?? undefined}
        className={cn(
          "group/directory-tree-row relative flex h-8 cursor-grab items-center gap-1.5 rounded-lg pr-2 text-sm font-medium text-[var(--app-sidebar-text)] transition-[background,box-shadow,opacity,transform] duration-150 hover:bg-slate-100 active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c7c7c7]",
          isSelected && "bg-[#e9e9e9]",
          isDragging && "scale-[0.995] opacity-35",
          dropPosition === "inside" && "bg-[#e2e2e2] shadow-[inset_0_0_0_1px_#c7c7c7]",
        )}
        style={{ paddingLeft: rowPaddingLeft }}
      >
        {dropPosition === "before" && <LayeredTreeDropIndicator position="before" left={dropIndicatorLeft} />}
        {dropPosition === "after" && <LayeredTreeDropIndicator position="after" left={dropIndicatorLeft} />}
        {item.hasChildren ? (
          <button
            type="button"
            onClick={handleToggleClick}
            aria-label={item.isExpanded ? `${item.name} を閉じる` : `${item.name} を開く`}
            className="flex h-8 w-4 shrink-0 items-center justify-center rounded text-[var(--app-sidebar-icon)] transition-colors hover:text-[var(--app-sidebar-text)]"
          >
            <IconChevronRight className={cn("h-4 w-4 transition-transform", item.isExpanded && "rotate-90")} />
          </button>
        ) : (
          <span aria-hidden="true" className="h-8 w-4 shrink-0" />
        )}
        <span title={item.name} className="flex h-8 min-w-0 flex-1 items-center text-left leading-[20px]">
          <TagBadge label={item.name} colorKey={item.colorKey} className="max-w-full" />
        </span>
      </div>
    </div>
  );
};
const TagTreeSidebar = () => {
  const { tags, tagById } = useTags();
  const { setTagTreePosition } = useTagTreeCommands(tagById);
  const tagFilter = useExplorerStore((state) => state.tagFilter);
  const setTagFilter = useExplorerStore((state) => state.setTagFilter);
  const clearTagFilter = useExplorerStore((state) => state.clearTagFilter);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const tagTreeNodes = useMemo(() => buildTagTreeNodes(tags), [tags]);
  const tagNodeById = useMemo(() => createTagNodeMap(tagTreeNodes), [tagTreeNodes]);
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
  const getChildTagNodes = useCallback((tagId: string): TagTreeNode[] => tagNodeById.get(tagId)?.children ?? [], [tagNodeById]);
  const getTagNodeParentId = useCallback((node: TagTreeNode): string | null => node.parentId, []);
  const getTagNodeOrderIndex = useCallback((node: TagTreeNode): number => node.orderIndex, []);
  const updateTagTreeNode = useCallback((tagId: string, patch: TagMovePatch) => setTagTreePosition(tagId, patch), [setTagTreePosition]);
  const { dragState, handleItemDragStart, handleItemDragOver, handleItemDragLeave, handleItemDrop, handleItemDragEnd, handleListDragOver, handleListDragLeave, handleListDrop } = useLayeredTreeDragDrop({ rootItems: tagTreeNodes, rootDropParentId: null, scrollContainerRef, getChildItems: getChildTagNodes, getParentId: getTagNodeParentId, getOrderIndex: getTagNodeOrderIndex, updateItem: updateTagTreeNode, setExpandedIds: setExpandedTagIds });
  const visibleTagItems = useMemo(() => flattenVisibleTagTree(tagTreeNodes, expandedTagIds), [expandedTagIds, tagTreeNodes]);
  const isAppendingToRoot = isLayeredTreeAppendDropTarget(dragState, null);
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
  return (
    <aside aria-label="Tag tree explorer" className="h-full min-h-0 overflow-hidden">
      <div ref={scrollContainerRef} className="h-full min-h-0 overflow-y-auto px-3 pb-3 pt-1">
        <div role="tree" aria-label="タグツリー" className="flex min-h-full flex-col gap-0.5" onDragOver={handleListDragOver} onDragLeave={handleListDragLeave} onDrop={handleListDrop}>
          {visibleTagItems.length > 0 ? visibleTagItems.map((item) => (
            <TagTreeRow key={item.id} item={item} selectedTagNames={selectedTagNames} dragState={dragState} onToggleTag={handleToggleTag} onSelectTag={handleSelectTag} onTagDragStart={handleItemDragStart} onTagDragOver={handleItemDragOver} onTagDragLeave={handleItemDragLeave} onTagDrop={handleItemDrop} onTagDragEnd={handleItemDragEnd} />
          )) : <p className="px-1 py-2 text-xs font-medium text-[#9aa1ad]">{EMPTY_TAG_MESSAGE}</p>}
          {isAppendingToRoot && <LayeredTreeDropIndicator position="append" left={LAYERED_TREE_ROOT_DROP_INDICATOR_LEFT_PX} className="mx-2" />}
          <div aria-hidden="true" className="min-h-8 flex-1" />
        </div>
      </div>
    </aside>
  );
};



export { TagTreeSidebar };
