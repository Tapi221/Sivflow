import { TagBadge } from "@/components/tag/TagBadge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { SurfaceButton } from "@/components/ui/surface-button";
import { Switch } from "@/components/ui/switch";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { useTags } from "@/hooks/settings/useTags";
import { cn } from "@/lib/utils";
import { Filter, Search, Tag } from "@/ui/icons";
import { useEffect, useMemo, useRef, useState } from "react";

interface TagFilterPopoverProps {
  allTags: string[];
  className?: string;
}

export const TagFilterPopover = ({
  allTags,
  className,
}: TagFilterPopoverProps) => {
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
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      queueMicrotask(() => setSearchQuery(""));
    }
  }, [isOpen]);

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return allTags;
    return allTags.filter((tag) =>
      tag.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [allTags, searchQuery]);

  const isFilterActive =
    tagFilter.length > 0 ||
    uncertaintyFilter !== "any" ||
    bookmarkedFilter !== "any" ||
    draftFilter !== "any" ||
    contentTypeFilter.length < 2;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "ds-filter-toggle flex items-center justify-center px-2 py-1 text-xs font-medium whitespace-nowrap",
            isFilterActive && "ds-filter-toggle--active",
            className,
          )}
        >
          <Filter className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="ds-popover-surface--filter w-64 overflow-hidden p-0"
      >
        <div className="ds-filter-panel flex flex-col">
          <div className="ds-filter-section bg-transparent p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="ds-filter-section__title text-xs font-semibold">
                タグで絞り込み
              </span>
              {isFilterActive && (
                <SurfaceButton
                  onClick={clearAllFilters}
                  surface="convex"
                  size="xs"
                  className="rounded-md hover:text-[#5f5557]"
                >
                  すべてクリア
                </SurfaceButton>
              )}
            </div>

            <div className="relative">
              <Search className="ds-filter-search-icon absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5" />
              <Input
                ref={inputRef}
                type="text"
                className={cn(
                  "ds-filter-search w-full",
                  "surface-concave",
                )}
                placeholder="タグを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="ds-filter-section flex items-center gap-2 bg-transparent px-3 py-2 text-[11px]">
            <span className="ds-filter-section__label">条件:</span>
            <div className="ds-segmented-control">
              <SurfaceButton
                onClick={() => setTagMatchMode("any")}
                surface={tagMatchMode === "any" ? "convexActive" : "concave"}
                size="xs"
              >
                いずれか (OR)
              </SurfaceButton>
              <SurfaceButton
                onClick={() => setTagMatchMode("all")}
                surface={tagMatchMode === "all" ? "convexActive" : "concave"}
                size="xs"
              >
                すべて (AND)
              </SurfaceButton>
            </div>
          </div>

          <div className="ds-filter-section space-y-2 bg-transparent px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="ds-filter-section__label">表示:</span>
              <div className="ds-segmented-control">
                {[
                  { label: "カード", value: "card" as const },
                  { label: "PDF", value: "pdf" as const },
                ].map((item) => (
                  <SurfaceButton
                    key={item.value}
                    onClick={() => toggleContentType(item.value)}
                    surface={
                      contentTypeFilter.includes(item.value)
                        ? "convexActive"
                        : "concave"
                    }
                    size="xs"
                  >
                    {item.label}
                  </SurfaceButton>
                ))}
              </div>
            </div>
            {[
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
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-2 text-[11px]"
              >
                <span className="ds-filter-section__label">{item.label}:</span>
                <div className="ds-segmented-control">
                  <SurfaceButton
                    onClick={() => item.onChange("any")}
                    surface={item.value === "any" ? "convexActive" : "concave"}
                    size="xs"
                  >
                    指定なし
                  </SurfaceButton>
                  <SurfaceButton
                    onClick={() => item.onChange("on")}
                    surface={item.value === "on" ? "convexActive" : "concave"}
                    size="xs"
                  >
                    あり
                  </SurfaceButton>
                  <SurfaceButton
                    onClick={() => item.onChange("off")}
                    surface={item.value === "off" ? "convexActive" : "concave"}
                    size="xs"
                  >
                    なし
                  </SurfaceButton>
                </div>
              </div>
            ))}
          </div>

          <div className="min-h-[150px] flex-1 overflow-y-auto bg-transparent p-1">
            {filteredTags.length === 0 ? (
              <div className="ds-filter-empty flex flex-col items-center justify-center py-8 text-xs">
                <Tag className="w-8 h-8 opacity-20 mb-2" />
                <p>タグが見つかりません</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredTags.map((tag) => {
                  const isSelected = tagFilter.includes(tag);
                  return (
                    <div
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "ds-filter-row w-full flex items-center px-2 py-1 text-xs text-left group",
                        isSelected && "ds-filter-row--active",
                      )}
                    >
                      <Switch
                        checked={isSelected}
                        onCheckedChange={() => toggleTag(tag)}
                        onClick={(e) => e.stopPropagation()}
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
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
