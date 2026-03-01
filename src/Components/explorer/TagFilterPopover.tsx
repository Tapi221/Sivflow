import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Filter, Search, Check, Tag } from 'lucide-react';
import { useExplorerStore } from '@/hooks/useExplorerStore';
import { useTags } from '@/hooks/useTags';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TagBadge } from '@/components/tag/TagBadge';

interface TagFilterPopoverProps {
  allTags: string[]; // 全タグ一覧（呼び出し元から渡す）
  className?: string;
}

export function TagFilterPopover({ allTags, className }: TagFilterPopoverProps) {
  const { getTagColor } = useTags();
  const {
    tagFilter,
    tagMatchMode,
    uncertaintyFilter,
    bookmarkedFilter,
    draftFilter,
    toggleTag,
    clearAllFilters,
    setTagMatchMode,
    setUncertaintyFilter,
    setBookmarkedFilter,
    setDraftFilter,
  } = useExplorerStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Popoverが開いたときに検索入力にフォーカス
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery(''); // 閉じたら検索クリア
    }
  }, [isOpen]);

  // タグ検索フィルタリング
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return allTags;
    return allTags.filter(tag =>
      tag.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allTags, searchQuery]);

  // フィルタ有効状態
  const isFilterActive =
    tagFilter.length > 0 ||
    uncertaintyFilter !== 'any' ||
    bookmarkedFilter !== 'any' ||
    draftFilter !== 'any';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-center px-2 py-1 text-xs font-medium transition-colors relative whitespace-nowrap",
            "hover:text-primary-600",
            isFilterActive ? "text-primary-600" : "text-slate-500",
            className
          )}
        >
          <Filter className="w-4 h-4" />
          {isFilterActive && (
            <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-primary-500 rounded-full" />
          )}
        </button>
      </PopoverTrigger>

      {/* ここが透け対策の本丸：bg-white/95 + blur + shadow + ring */}
      <PopoverContent
        align="end"
        className={cn(
          "w-64 p-0",
          "bg-white/95 backdrop-blur-md",
          "text-slate-800",
          "shadow-2xl ring-1 ring-slate-200/80",
          "overflow-hidden"
        )}
      >
        <div className="flex flex-col max-h-[400px]">
          {/* Header & Search */}
          <div className="p-3 border-b border-slate-200/70">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800">タグで絞り込み</span>
              {isFilterActive && (
                <button
                  onClick={clearAllFilters}
                  className="text-[11px] px-2 py-0.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                >
                  すべてクリア
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                className={cn(
                  "w-full pl-8 pr-2 py-1.5 text-xs rounded",
                  "border border-slate-200 bg-white/90",
                  "focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-400/60 focus:border-primary-300",
                  "placeholder:text-slate-400",
                  "transition-colors"
                )}
                placeholder="タグを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Match Mode Toggle */}
          <div className="px-3 py-2 border-b border-slate-200/70 flex items-center gap-2 text-[11px] bg-white/70">
            <span className="text-slate-500">条件:</span>
            <div className="flex bg-white rounded border border-slate-200 p-0.5 shadow-sm">
              <button
                onClick={() => setTagMatchMode('any')}
                className={cn(
                  "px-2 py-0.5 rounded transition-colors text-[11px]",
                  tagMatchMode === 'any'
                    ? "bg-primary-100 text-primary-800 font-medium"
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                )}
              >
                いずれか (OR)
              </button>
              <button
                onClick={() => setTagMatchMode('all')}
                className={cn(
                  "px-2 py-0.5 rounded transition-colors text-[11px]",
                  tagMatchMode === 'all'
                    ? "bg-primary-100 text-primary-800 font-medium"
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                )}
              >
                すべて (AND)
              </button>
            </div>
          </div>

          <div className="px-3 py-2 border-b border-slate-200/70 bg-white/70 space-y-2">
            {[
              {
                label: 'はてな',
                value: uncertaintyFilter,
                onChange: setUncertaintyFilter,
              },
              {
                label: '星',
                value: bookmarkedFilter,
                onChange: setBookmarkedFilter,
              },
              {
                label: '下書き',
                value: draftFilter,
                onChange: setDraftFilter,
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-600">{item.label}:</span>
                <div className="flex bg-white rounded border border-slate-200 p-0.5 shadow-sm">
                  <button
                    onClick={() => item.onChange('any')}
                    className={cn(
                      'px-2 py-0.5 rounded transition-colors',
                      item.value === 'any'
                        ? 'bg-primary-100 text-primary-800 font-medium'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                    )}
                  >
                    指定なし
                  </button>
                  <button
                    onClick={() => item.onChange('on')}
                    className={cn(
                      'px-2 py-0.5 rounded transition-colors',
                      item.value === 'on'
                        ? 'bg-primary-100 text-primary-800 font-medium'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                    )}
                  >
                    あり
                  </button>
                  <button
                    onClick={() => item.onChange('off')}
                    className={cn(
                      'px-2 py-0.5 rounded transition-colors',
                      item.value === 'off'
                        ? 'bg-primary-100 text-primary-800 font-medium'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                    )}
                  >
                    なし
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Tag List */}
          <div className="flex-1 overflow-y-auto min-h-[150px] p-1 bg-white/60">
            {filteredTags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-xs">
                <Tag className="w-8 h-8 opacity-20 mb-2" />
                <p>タグが見つかりません</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredTags.map(tag => {
                  const isSelected = tagFilter.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "w-full flex items-center px-2 py-1 text-xs rounded transition-colors text-left group",
                        isSelected
                          ? "bg-slate-100 text-slate-800"
                          : "hover:bg-slate-100 text-slate-800"
                      )}
                    >
                      <div
                        className={cn(
                          "w-4 h-4 mr-2 border rounded flex items-center justify-center transition-colors",
                          isSelected
                            ? "bg-primary-600 border-primary-600 text-white"
                            : "border-slate-300 bg-white group-hover:border-slate-400"
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <TagBadge
                          label={tag}
                          size="xs"
                          colorClass={getTagColor(tag)}
                          className="max-w-full"
                        />
                      </div>
                    </button>
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
