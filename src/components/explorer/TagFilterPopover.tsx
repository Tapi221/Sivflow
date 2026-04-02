import React, { useState, useMemo, useRef, useEffect } from "react";
import { Filter, Search, Tag } from "@/ui/icons";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { useTags } from "@/hooks/settings/useTags";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TagBadge } from "@/components/tag/TagBadge";
import { Switch } from "@/components/ui/switch";
import { SurfaceButton } from "@/components/ui/surface-button";

interface TagFilterPopoverProps {
  allTags: string[]; // 全タグ一覧（呼び出し元から渡す）
  className?: string;
}

export function TagFilterPopover({
  allTags,
  className,
}: TagFilterPopoverProps) {
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

  // ダイアログ開いた時に検索ボックスフォーカス
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      queueMicrotask(() => setSearchQuery("")); // 閉じたら検索クリア
    }
  }, [isOpen]);

  // タグ検索フィルタリング
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return allTags;
    return allTags.filter((tag) =>
      tag.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [allTags, searchQuery]);

  // フィルタ有効状態
  const isFilterActive =
    tagFilter.length > 0 ||
    uncertaintyFilter !== "any" ||
    bookmarkedFilter !== "any" ||
    draftFilter !== "any" ||
    contentTypeFilter.length < 3;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-center px-2 py-1 text-xs font-medium transition-colors relative whitespace-nowrap",
            "hover:text-primary-700",
            isFilterActive ? "text-primary-700" : "text-slate-500",
            className,
          )}
        >
          <Filter className="w-4 h-4" />
          {isFilterActive && (
            <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-primary-500 rounded-full" />
          )}
        </button>
      </PopoverTrigger>

      {/* 透け対策：bg-white/95 + blur + shadow + ring */}
      <PopoverContent
        align="center"
        surface="floating"
        className={cn(
          "w-64 p-0",
          "overflow-hidden",
        )}
      >
        <div className="flex flex-col max-h-[400px]">
          {/* Header & Search */}
          <div className="border-b border-[var(--surface-border)] bg-white/28 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800">
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
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                className={cn(
                  "w-full pl-8 pr-2 py-1.5 text-xs rounded",
                  "border border-[var(--surface-border)] bg-white/58 text-[#202123]",
                  "surface-concave",
                  "focus:bg-white/72 focus:outline-none focus:ring-0 focus:border-[#cfcfcf]",
                  "placeholder:text-[var(--surface-placeholder-text)]",
                  "transition-colors",
                )}
                placeholder="タグを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* AND,ORトグル */}
          <div className="flex items-center gap-2 border-b border-[var(--surface-border)] bg-white/34 px-3 py-2 text-[11px]">
            <span className="text-slate-500">条件:</span>
            <div className="flex rounded border border-[var(--surface-border)] bg-white/48 p-0.5 shadow-sm">
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

          <div className="space-y-2 border-b border-[var(--surface-border)] bg-white/34 px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-600">表示:</span>
              <div className="flex rounded border border-[var(--surface-border)] bg-white/48 p-0.5 shadow-sm">
                {[
                  { label: "カード", value: "card" as const },
                  { label: "PDF", value: "pdf" as const },
                  { label: "PPTX", value: "pptx" as const },
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
                <span className="text-slate-600">{item.label}:</span>
                <div className="flex rounded border border-[var(--surface-border)] bg-white/48 p-0.5 shadow-sm">
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

          {/* タグリスト */}
          <div className="min-h-[150px] flex-1 overflow-y-auto bg-white/24 p-1">
            {filteredTags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-xs">
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
                        "w-full flex items-center px-2 py-1 text-xs rounded transition-colors text-left group",
                        isSelected
                          ? "bg-slate-100 text-slate-800"
                          : "hover:bg-slate-100 text-slate-800",
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
}






