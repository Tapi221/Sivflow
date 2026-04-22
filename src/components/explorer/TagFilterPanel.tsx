import { TagBadge } from "@/components/tag/TagBadge";
import { FilterPanelShell } from "@/components/panel/FilterPanelShell";
import { PanelEmptyState } from "@/components/panel/PanelEmptyState";
import {
  SegmentedControlGroup,
  type SegmentedOption,
} from "@/components/panel/SegmentedControlGroup";
import { SurfaceButton } from "@/components/ui/surface-button";
import { Switch } from "@/components/ui/switch";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { useTags } from "@/hooks/settings/useTags";
import { cn } from "@/lib/utils";
import { Tag } from "@/ui/icons";
import { useEffect, useMemo, useRef, useState } from "react";

type ContentTypeFilter = "card" | "pdf";
type ToggleableFlag = "any" | "on" | "off";
type TagMatchMode = "any" | "all";

interface TagFilterPanelProps {
  allTags: string[];
  isOpen?: boolean;
  className?: string;
}

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

export const TagFilterPanel = ({
  allTags,
  isOpen = false,
  className,
}: TagFilterPanelProps) => {
  const { getTagColor } = useTags();
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

  const filteredTags = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();

    if (normalizedSearchQuery.length === 0) {
      return allTags;
    }

    return allTags.filter((tag) =>
      tag.toLocaleLowerCase().includes(normalizedSearchQuery),
    );
  }, [allTags, searchQuery]);

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

  return (
    <FilterPanelShell
      title="タグで絞り込み"
      searchValue={searchQuery}
      searchPlaceholder="タグを検索..."
      onSearchChange={setSearchQuery}
      searchInputRef={inputRef}
      className={className}
      bodyClassName="min-h-[150px]"
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
          <div className="ds-filter-section flex items-center gap-2 bg-transparent px-3 py-2 text-[11px]">
            <span className="ds-filter-section__label">条件:</span>
            <SegmentedControlGroup
              value={tagMatchMode}
              options={TAG_MATCH_MODE_OPTIONS}
              onChange={setTagMatchMode}
            />
          </div>

          <div className="ds-filter-section space-y-2 bg-transparent px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="ds-filter-section__label">表示:</span>

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
                className="flex items-center justify-between gap-2 text-[11px]"
              >
                <span className="ds-filter-section__label">{item.label}:</span>

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
      {filteredTags.length === 0 ? (
        <PanelEmptyState
          icon={<Tag className="h-8 w-8" />}
          message="タグが見つかりません"
        />
      ) : (
        <div className="space-y-0.5">
          {filteredTags.map((tag) => {
            const isSelected = tagFilter.includes(tag);

            return (
              <div
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  "ds-filter-row group flex w-full items-center px-2 py-1 text-left text-xs",
                  isSelected && "ds-filter-row--active",
                )}
              >
                <Switch
                  checked={isSelected}
                  onCheckedChange={() => toggleTag(tag)}
                  onClick={(event) => event.stopPropagation()}
                  className="mr-2"
                  aria-label={`${tag} を${isSelected ? "除外" : "追加"}`}
                />

                <div className="min-w-0 flex-1">
                  <TagBadge
                    label={tag}
                    size="xs"
                    colorClass={getTagColor(tag)}
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
