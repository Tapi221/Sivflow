import { useEffect, useMemo, useRef, useState } from "react";
import { TagBadge } from "@web-renderer/chip/budge/tag/Badge.Tag";
import type { TagColorKey } from "@web-renderer/chip/budge/tag/tagColor";
import { getTagColorKey } from "@web-renderer/chip/budge/tag/tagColor";
import { SurfaceButton } from "@web-renderer/chip/button/button/surface-button";
import { Tag } from "@web-renderer/chip/icons";
import { FilterPanelShell } from "@web-renderer/chip/panel/panel/FilterPanelShell";
import { PanelEmptyState } from "@web-renderer/chip/panel/panel/PanelEmptyState";
import type { SegmentedOption } from "@web-renderer/chip/panel/panel/SegmentedControlGroup";
import { SegmentedControlGroup } from "@web-renderer/chip/panel/panel/SegmentedControlGroup";
import { cn } from "@web-renderer/lib/utils";
import type { KeyboardEvent, MouseEvent } from "react";
import { useExplorerStore } from "@/features/explorer/store/useExplorerStore";
import { useTags } from "@/features/settings/hooks/useTags";



type ContentTypeFilter = "card" | "pdf";
type ToggleableFlag = "any" | "on" | "off";
type TagMatchMode = "any" | "all";
type TagTreeSource = {
  id: string;
  name: string;
  color?: string | null;
  parentId?: string | null;
};
type TagTreeNode = {
  id: string;
  name: string;
  nameLower: string;
  colorKey: TagColorKey;
  parentId: string | null;
  children: TagTreeNode[];
};
type VisibleTagTreeItem = {
  id: string;
  name: string;
  colorKey: TagColorKey;
  depth: number;
};
type TagFilterPanelProps = {
  allTags: string[];
  isOpen?: boolean;
  className?: string;
};
type TagFilterSelectionSwitchProps = {
  label: string;
  checked: boolean;
  onToggle: () => void;
};



const TAG_MATCH_MODE_OPTIONS = [
  { label: "いずれか (OR)", value: "any" },
  { label: "すべて (AND)", value: "all" },
] as const satisfies ReadonlyArray<SegmentedOption<TagMatchMode>>;
const TOGGLEABLE_FLAG_OPTIONS = [
  { label: "指定なし", value: "any" },
  { label: "あり", value: "on" },
  { label: "なし", value: "off" },
] as const satisfies ReadonlyArray<SegmentedOption<ToggleableFlag>>;
const CONTENT_TYPE_OPTIONS = [
  { label: "カード", value: "card" },
  { label: "PDF", value: "pdf" },
] as const satisfies ReadonlyArray<{
  label: string;
  value: ContentTypeFilter;
}>;



const normalizeTagParentId = (parentId: string | null | undefined): string | null => {
  return typeof parentId === "string" && parentId.trim().length > 0
    ? parentId
    : null;
};
const sortTagTreeNodes = (nodes: TagTreeNode[]): TagTreeNode[] => {
  return nodes.sort((left, right) => left.name.localeCompare(right.name, "ja"));
};
const cloneTagTreeBranch = (node: TagTreeNode): TagTreeNode => {
  return {
    ...node,
    children: node.children.map(cloneTagTreeBranch),
  };
};
const filterTagTreeNode = (
  node: TagTreeNode,
  normalizedSearchQuery: string,
): TagTreeNode | null => {
  const selfMatches = node.nameLower.includes(normalizedSearchQuery);
  const children = selfMatches
    ? node.children.map(cloneTagTreeBranch)
    : node.children
      .map((child) => filterTagTreeNode(child, normalizedSearchQuery))
      .filter((child): child is TagTreeNode => child !== null);

  if (!selfMatches && children.length === 0) {
    return null;
  }

  return {
    ...node,
    children,
  };
};
const flattenTagTreeNodes = (
  nodes: TagTreeNode[],
  depth: number,
): VisibleTagTreeItem[] => {
  return nodes.flatMap((node) => [
    {
      id: node.id,
      name: node.name,
      colorKey: node.colorKey,
      depth,
    },
    ...flattenTagTreeNodes(node.children, depth + 1),
  ]);
};
const buildTagTreeNodes = (
  tagRecords: ReadonlyArray<TagTreeSource>,
  allTags: string[],
): TagTreeNode[] => {
  const nodeById = new Map<string, TagTreeNode>();
  const nameLowerSet = new Set<string>();

  tagRecords.forEach((tag) => {
    const name = tag.name.trim();
    if (!name) return;

    const nameLower = name.toLocaleLowerCase();
    nodeById.set(tag.id, {
      id: tag.id,
      name,
      nameLower,
      colorKey: getTagColorKey(tag.color ?? undefined),
      parentId: normalizeTagParentId(tag.parentId),
      children: [],
    });
    nameLowerSet.add(nameLower);
  });

  allTags.forEach((label) => {
    const name = label.trim();
    if (!name) return;

    const nameLower = name.toLocaleLowerCase();
    if (nameLowerSet.has(nameLower)) return;

    nodeById.set(`fallback:${nameLower}`, {
      id: `fallback:${nameLower}`,
      name,
      nameLower,
      colorKey: getTagColorKey(),
      parentId: null,
      children: [],
    });
    nameLowerSet.add(nameLower);
  });

  const roots: TagTreeNode[] = [];

  nodeById.forEach((node) => {
    const parentId = node.parentId;
    const parent = parentId ? nodeById.get(parentId) : undefined;

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
const buildVisibleTagTreeItems = (
  tagRecords: ReadonlyArray<TagTreeSource>,
  allTags: string[],
  searchQuery: string,
): VisibleTagTreeItem[] => {
  const tagTreeNodes = buildTagTreeNodes(tagRecords, allTags);
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const visibleNodes = normalizedSearchQuery
    ? tagTreeNodes
      .map((node) => filterTagTreeNode(node, normalizedSearchQuery))
      .filter((node): node is TagTreeNode => node !== null)
    : tagTreeNodes;

  return flattenTagTreeNodes(visibleNodes, 0);
};



const TagFilterSelectionSwitch = ({ label, checked, onToggle }: TagFilterSelectionSwitchProps) => {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggle();
  };

  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={`${label} を${checked ? "除外" : "追加"}`} onClick={handleClick} className={cn("mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7d7d7]", checked ? "border-[color:var(--ds-semantic-color-action-primary)] bg-[color:var(--ds-semantic-color-action-primary)]" : "border-[color:var(--ds-semantic-color-border-default)] bg-[color:var(--ds-semantic-color-background-app)] shadow-[var(--ds-semantic-elevation-control-inset)]")}>
      <span className={cn("h-2 w-2 rounded-full bg-white transition-opacity duration-150", checked ? "opacity-100" : "opacity-0")} />
    </button>
  );
};
const TagFilterPanel = ({ allTags, isOpen = false, className }: TagFilterPanelProps) => {
  const { tags: tagRecords } = useTags();
  const {
    tagFilter,
    tagMatchMode,
    uncertaintyFilter,
    bookmarkedFilter,
    draftFilter,
    contentTypeFilter,
    toggleTag,
    clearAllFilters,
    setTagMatchMode,
    setUncertaintyFilter,
    setBookmarkedFilter,
    setDraftFilter,
    toggleContentType,
  } = useExplorerStore();

  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let timeoutId: number | null = null;

    if (isOpen) {
      timeoutId = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      queueMicrotask(() => setSearchQuery(""));
    }

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isOpen]);

  const visibleTagItems = useMemo(
    () => buildVisibleTagTreeItems(tagRecords, allTags, searchQuery),
    [allTags, searchQuery, tagRecords],
  );

  const isFilterActive =
    tagFilter.length > 0 ||
    uncertaintyFilter !== "any" ||
    bookmarkedFilter !== "any" ||
    draftFilter !== "any" ||
    contentTypeFilter.length < 2;

  const toggleableRows = [
    {
      label: "はてな",
      value: uncertaintyFilter,
      onChange: setUncertaintyFilter,
    },
    {
      label: "お気に入り",
      value: bookmarkedFilter,
      onChange: setBookmarkedFilter,
    },
    {
      label: "下書き",
      value: draftFilter,
      onChange: setDraftFilter,
    },
  ] as const satisfies ReadonlyArray<{
    label: string;
    value: ToggleableFlag;
    onChange: (value: ToggleableFlag) => void;
  }>;

  const handleTagRowKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    tag: string,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleTag(tag);
  };

  return (
    <FilterPanelShell
      searchValue={searchQuery}
      searchPlaceholder="タグを検索..."
      onSearchChange={setSearchQuery}
      searchInputRef={inputRef}
      className={className}
      bodyClassName="min-h-36"
      headerAction={
        isFilterActive ? (
          <SurfaceButton
            onClick={clearAllFilters}
            surface="convex"
            size="xs"
            className="rounded-md hover:text-[#5f5557]"
          >
            すべてクリア
          </SurfaceButton>
        ) : null
      }
      sections={
        <>
          <div className="ds-filter-section ds-floating-panel__section ds-floating-panel__section--dense flex items-center gap-2 bg-transparent text-xs">
            <span className="ds-filter-section__label ds-floating-panel__label">
              条件:
            </span>
            <SegmentedControlGroup
              value={tagMatchMode}
              options={TAG_MATCH_MODE_OPTIONS}
              onChange={setTagMatchMode}
            />
          </div>
          <div className="ds-filter-section ds-floating-panel__section ds-floating-panel__section--dense space-y-2 bg-transparent">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="ds-filter-section__label ds-floating-panel__label">
                表示:
              </span>
              <div className="ds-filter-toggle-group">
                {CONTENT_TYPE_OPTIONS.map((item) => {
                  const isSelected = contentTypeFilter.includes(item.value);

                  return (
                    <SurfaceButton
                      key={item.value}
                      onClick={() => toggleContentType(item.value)}
                      surface={isSelected ? "convexActive" : "concave"}
                      size="xs"
                    >
                      {item.label}
                    </SurfaceButton>
                  );
                })}
              </div>
            </div>

            {toggleableRows.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="ds-filter-section__label ds-floating-panel__label">
                  {item.label}:
                </span>
                <SegmentedControlGroup
                  value={item.value}
                  options={TOGGLEABLE_FLAG_OPTIONS}
                  onChange={item.onChange}
                />
              </div>
            ))}
          </div>
        </>
      }
    >
      {visibleTagItems.length === 0 ? (
        <PanelEmptyState
          icon={<Tag className="h-8 w-8" />}
          message="タグが見つかりません"
        />
      ) : (
        <div role="tree" className="space-y-0.5">
          {visibleTagItems.map((item) => {
            const isSelected = tagFilter.includes(item.name);

            return (
              <div
                key={item.id}
                role="treeitem"
                tabIndex={0}
                aria-level={item.depth + 1}
                aria-pressed={isSelected}
                onClick={() => toggleTag(item.name)}
                onKeyDown={(event) => handleTagRowKeyDown(event, item.name)}
                style={{ paddingLeft: `${8 + item.depth * 14}px` }}
                className={cn(
                  "ds-floating-panel__row ds-filter-row group flex w-full items-center py-1 pr-2 text-left text-xs outline-none",
                  isSelected &&
                  "ds-floating-panel__row--active ds-filter-row--active",
                )}
              >
                <TagFilterSelectionSwitch label={item.name} checked={isSelected} onToggle={() => toggleTag(item.name)} />
                <div className="min-w-0 flex-1">
                  <TagBadge
                    label={item.name}
                    colorKey={item.colorKey}
                    className="max-w-full"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </FilterPanelShell>
  );
};



export { TagFilterPanel };
