import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useTags, type Tag as TagRecord } from "@/features/settings/hooks/useTags";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { cn } from "@/lib/utils";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import { StratisTagIcon } from "@/ui/icons/stratis";

type TagTreeNode = {
  id: string;
  name: string;
  parentId: string | null;
  children: TagTreeNode[];
};

type VisibleTagTreeNode = {
  id: string;
  name: string;
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
};

type TagTreeRowProps = {
  item: VisibleTagTreeNode;
  selectedTagNames: Set<string>;
  onToggleTag: (tagId: string) => void;
  onSelectTag: (tagName: string) => void;
};

const LIBRARY_TITLE = "Library";
const ROOT_LEVEL = 1;

const IconChevronRight = ({ className }: { className?: string }) => (<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>);

const getTagName = (tag: TagRecord): string => {
  const name = tag.name.trim();
  return name.length > 0 ? name : "無題のタグ";
};

const getTagParentId = (tag: TagRecord): string | null => typeof tag.parentId === "string" && tag.parentId.trim().length > 0 ? tag.parentId : null;

const sortTagTreeNodes = (nodes: TagTreeNode[]): TagTreeNode[] => nodes.sort((left, right) => left.name.localeCompare(right.name, "ja"));

const buildTagTreeNodes = (tags: TagRecord[]): TagTreeNode[] => {
  const nodeById = new Map<string, TagTreeNode>();

  tags.forEach((tag) => {
    nodeById.set(tag.id, { id: tag.id, name: getTagName(tag), parentId: getTagParentId(tag), children: [] });
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
  const item: VisibleTagTreeNode = { id: node.id, name: node.name, level, hasChildren, isExpanded };

  if (!hasChildren || !isExpanded) return [item];

  return [item, ...flattenVisibleTagTree(node.children, expandedTagIds, level + 1, nextVisitedTagIds)];
});

const TagTreeRow = ({ item, selectedTagNames, onToggleTag, onSelectTag }: TagTreeRowProps) => {
  const isSelected = selectedTagNames.has(item.name);
  const rowPaddingLeft = Math.max(0, item.level - ROOT_LEVEL) * 14;

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

  return <div data-tag-id={item.id}><div role="treeitem" aria-level={item.level} aria-expanded={item.hasChildren ? item.isExpanded : undefined} aria-selected={isSelected} className={cn("flex h-8 items-center gap-1 rounded-[8px] pr-2 text-[14px] font-medium text-[var(--app-sidebar-text)]", isSelected && "bg-[#e9e9e9]")} style={{ paddingLeft: rowPaddingLeft }}><button type="button" onClick={handleToggleClick} aria-label={item.isExpanded ? `${item.name} を閉じる` : `${item.name} を開く`} aria-disabled={!item.hasChildren} disabled={!item.hasChildren} className="library-tree-marker"><IconChevronRight className={cn("h-3.5 w-3.5 transition-transform", item.hasChildren ? "opacity-100" : "opacity-0", item.isExpanded && "rotate-90")} /></button><button type="button" onClick={handleRowClick} title={item.name} className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[8px] text-left text-inherit hover:bg-[#eeeeee]"><StratisTagIcon className="layered-directory-row-icon" /><span className="min-w-0 flex-1 truncate">{item.name}</span></button></div></div>;
};

const TagTreeSidebar = () => {
  const { tags } = useTags();
  const tagFilter = useExplorerStore((state) => state.tagFilter);
  const setTagFilter = useExplorerStore((state) => state.setTagFilter);
  const clearTagFilter = useExplorerStore((state) => state.clearTagFilter);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const tagTreeNodes = useMemo(() => buildTagTreeNodes(tags), [tags]);
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

  return <aside aria-label="Tag tree explorer" className="h-full min-h-0 overflow-hidden"><div className="h-full min-h-0 overflow-y-auto px-3 pb-3 pt-1"><div role="tree" aria-label="タグツリー" className="flex flex-col gap-0.5">{visibleTagItems.length > 0 ? visibleTagItems.map((item) => <TagTreeRow key={item.id} item={item} selectedTagNames={selectedTagNames} onToggleTag={handleToggleTag} onSelectTag={handleSelectTag} />) : <p className="px-1 py-2 text-[13px] font-medium text-[#9aa1ad]">タグがありません</p>}</div></div></aside>;
};

export { TagTreeSidebar };
