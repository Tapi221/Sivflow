import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import type { TagColorKey } from "@/chip/budge/tag/tagColor";
import { getTagColorKey } from "@/chip/budge/tag/tagColor";
import { TagBadge } from "@/chip/budge/tag/Badge.Tag";
import type { Tag as TagRecord } from "@/features/settings/hooks/useTags";
import { useTags } from "@/features/settings/hooks/useTags";
import { useTagTreeCommands } from "@/features/settings/hooks/useTagTreeCommands";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { cn } from "@/lib/utils";
import { LayeredTreeDropIndicator } from "@/pane.desktop/leftpane/folder/layeredTreeDnd";
import { LAYERED_TREE_INDENT_PX, LAYERED_TREE_ROOT_DROP_INDICATOR_LEFT_PX, LAYERED_TREE_ROOT_LEVEL } from "@/pane.desktop/leftpane/folder/layeredTreeDnd.constants";
import type { LayeredTreeDragState } from "@/pane.desktop/leftpane/folder/layeredTreeDnd.types";
import { getLayeredTreeDropIndicatorLeft, isLayeredTreeAppendDropTarget } from "@/pane.desktop/leftpane/folder/layeredTreeDnd.utils";
import { useLayeredTreeDragDrop } from "@/pane.desktop/leftpane/folder/useLayeredTreeDragDrop";
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
    const parent = node.parentId ? nodeById.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
      return;
    }
    node.parentId = null;
    roots.push(node);
  });
  nodeById.forEach((node) => sortTagTreeNodes(node.children));
  return sortTagTreeNodes(roots);
};
const flattenTagTreeNodes = (nodes: TagTreeNode[], expandedIds: Set<string>, level = 0): VisibleTagTreeNode[] => nodes.flatMap((node) => {
  const isExpanded = expandedIds.has(node.id);
  return [
    {
      id: node.id,
      name: node.name,
      colorKey: node.colorKey,
      parentId: node.parentId,
      orderIndex: node.orderIndex,
      level,
      hasChildren: node.children.length > 0,
      isExpanded,
    },
    ...(isExpanded ? flattenTagTreeNodes(node.children, expandedIds, level + 1) : []),
  ];
});
const TagTreeRow = ({ item, selectedTagNames, dragState, onToggleTag, onSelectTag, onTagDragStart, onTagDragOver, onTagDragLeave, onTagDrop, onTagDragEnd }: TagTreeRowProps) => {
  const isSelected = selectedTagNames.has(item.name);
  const isDropTarget = dragState.targetId === item.id;
  const isAppendTarget = isDropTarget && isLayeredTreeAppendDropTarget(dragState.position);
  const isIndicatorVisible = isDropTarget && !isAppendTarget;
  const dropIndicatorLeft = getLayeredTreeDropIndicatorLeft(dragState.position, item.level);
  return (
    <div
      className="relative"
      onDragOver={(event) => onTagDragOver(event, item.id)}
      onDragLeave={(event) => onTagDragLeave(event, item.id)}
      onDrop={(event) => onTagDrop(event, item.id)}
    >
      {isIndicatorVisible ? (
        <LayeredTreeDropIndicator left={dropIndicatorLeft} position={dragState.position} />
      ) : null}
      <div
        draggable
        role="treeitem"
        aria-level={item.level + 1}
        aria-expanded={item.hasChildren ? item.isExpanded : undefined}
        aria-selected={isSelected}
        tabIndex={0}
        className={cn(
          "group flex min-h-7 w-full items-center gap-1 rounded-md px-2 py-1 text-xs outline-none transition-colors",
          isSelected ? "bg-[color:var(--ds-semantic-color-action-primary-surface)]" : "hover:bg-[color:var(--ds-semantic-color-hover-muted)]",
          isAppendTarget && "ring-1 ring-[color:var(--ds-semantic-color-action-primary)]",
        )}
        style={{ paddingLeft: `${LAYERED_TREE_INDENT_PX * item.level + 8}px` }}
        onClick={() => onSelectTag(item.name)}
        onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelectTag(item.name);
          }
          if (event.key === "ArrowRight" && item.hasChildren && !item.isExpanded) {
            event.preventDefault();
            onToggleTag(item.id);
          }
          if (event.key === "ArrowLeft" && item.hasChildren && item.isExpanded) {
            event.preventDefault();
            onToggleTag(item.id);
          }
        }}
        onDragStart={(event) => onTagDragStart(event, item.id)}
        onDragEnd={onTagDragEnd}
      >
        <button
          type="button"
          aria-label={item.isExpanded ? `${item.name}を閉じる` : `${item.name}を開く`}
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded text-[color:var(--ds-semantic-color-text-muted)] transition-colors hover:bg-[color:var(--ds-semantic-color-hover-muted)]",
            !item.hasChildren && "invisible",
          )}
          onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            onToggleTag(item.id);
          }}
        >
          <span className={cn("text-[10px] leading-none transition-transform", item.isExpanded && "rotate-90")}>▶</span>
        </button>
        <TagBadge label={item.name} colorKey={item.colorKey} selected={isSelected} className="max-w-full" />
      </div>
    </div>
  );
};
const TagTreeSidebar = () => {
  const { tags } = useTags();
  const { tagFilter, toggleTag } = useExplorerStore();
  const { updateTag } = useTagTreeCommands();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const treeNodes = useMemo(() => buildTagTreeNodes(tags), [tags]);
  const tagById = useMemo(() => {
    const map = new Map<string, TagTreeNode>();
    const visit = (nodes: TagTreeNode[]) => {
      nodes.forEach((node) => {
        map.set(node.id, node);
        visit(node.children);
      });
    };
    visit(treeNodes);
    return map;
  }, [treeNodes]);
  useEffect(() => {
    setExpandedIds((current) => {
      const next = new Set(current);
      treeNodes.forEach((node) => next.add(node.id));
      return next;
    });
  }, [treeNodes]);
  const visibleItems = useMemo(() => flattenTagTreeNodes(treeNodes, expandedIds), [expandedIds, treeNodes]);
  const selectedTagNames = useMemo(() => new Set(tagFilter), [tagFilter]);
  const tabsStore = useWorkspaceTabsStore();
  const lastSelectedTagRef = useRef<string | null>(null);
  const handleSelectTag = useCallback((tagName: string) => {
    lastSelectedTagRef.current = tagName;
    toggleTag(tagName);
  }, [toggleTag]);
  const handleToggleTag = useCallback((tagId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }, []);
  const handleMoveTag = useCallback(async (tagId: string, patch: TagMovePatch) => {
    await updateTag(tagId, patch);
  }, [updateTag]);
  const { dragState, handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd } = useLayeredTreeDragDrop({
    items: visibleItems.map((item) => ({ id: item.id, parentId: item.parentId, level: item.level, orderIndex: item.orderIndex })),
    rootLevel: LAYERED_TREE_ROOT_LEVEL,
    rootDropIndicatorLeft: LAYERED_TREE_ROOT_DROP_INDICATOR_LEFT_PX,
    onMove: handleMoveTag,
  });
  useEffect(() => {
    const lastSelectedTag = lastSelectedTagRef.current;
    if (!lastSelectedTag || !selectedTagNames.has(lastSelectedTag)) return;
    const selectedTabId = tabsStore.selectedTabId;
    if (!selectedTabId) return;
    const tab = tabsStore.tabs.find((item) => item.id === selectedTabId);
    if (!tab) return;
    if (tab.type === "folder") return;
    tabsStore.openFolderTab(LIBRARY_TITLE, null);
  }, [selectedTagNames, tabsStore]);
  if (tags.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-[color:var(--ds-semantic-color-text-muted)]">
        {EMPTY_TAG_MESSAGE}
      </div>
    );
  }
  return (
    <div role="tree" className="space-y-0.5 px-1 py-1">
      {visibleItems.map((item) => (
        <TagTreeRow
          key={item.id}
          item={item}
          selectedTagNames={selectedTagNames}
          dragState={dragState}
          onToggleTag={handleToggleTag}
          onSelectTag={handleSelectTag}
          onTagDragStart={handleDragStart}
          onTagDragOver={handleDragOver}
          onTagDragLeave={handleDragLeave}
          onTagDrop={handleDrop}
          onTagDragEnd={handleDragEnd}
        />
      ))}
    </div>
  );
};

export { TagTreeSidebar };
