import { TagBadge } from '@/components/tag/TagBadge';
import { useExplorerStore } from '@/hooks/useExplorerStore';

interface ExplorerFilterSummaryProps {
  getTagColor: (tagNameOrId: string) => string;
  isFilterActive: boolean;
  resultCount: number;
  className?: string;
}

export function ExplorerFilterSummary({
  getTagColor,
  isFilterActive,
  resultCount,
  className,
}: ExplorerFilterSummaryProps) {
  const {
    tagFilter,
    toggleTag,
    clearAllFilters,
    tagMatchMode,
    uncertaintyFilter,
    bookmarkedFilter,
    draftFilter,
    contentTypeFilter,
  } = useExplorerStore();

  if (!isFilterActive) return null;

  const matchModeLabel = tagMatchMode === 'any' ? 'どれか一致（OR）' : '全部一致（AND）';

  return (
    <div className={className ?? 'px-2 py-2 bg-[var(--sidebar-bg)] border-b border-[var(--sidebar-border)]'}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="min-w-0 flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600 shrink-0">絞り込み中</span>
          <span className="text-[11px] text-slate-500 truncate">
            {matchModeLabel}
            <span className="mx-1 text-slate-300">•</span>
            結果 {resultCount} 件
          </span>
          {resultCount === 0 ? <span className="text-[11px] text-rose-500/90 shrink-0">一致なし</span> : null}
        </div>

        <button
          type="button"
          onClick={clearAllFilters}
          className="shrink-0 text-[11px] px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
        >
          クリア
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {contentTypeFilter.length < 3
          ? contentTypeFilter.map((type) => (
              <TagBadge
                key={type}
                label={type === 'card' ? 'カード' : type.toUpperCase()}
                size="sm"
                colorClass="bg-slate-100 text-slate-700 border-slate-200"
              />
            ))
          : null}
        {tagFilter.map((tag) => (
          <TagBadge
            key={tag}
            label={tag}
            size="sm"
            colorClass={getTagColor(tag)}
            className="max-w-[180px]"
            onRemove={() => toggleTag(tag)}
            removeAriaLabel={`${tag}を削除`}
          />
        ))}
        {uncertaintyFilter !== 'any' ? (
          <TagBadge
            label={`はてな: ${uncertaintyFilter === 'on' ? 'あり' : 'なし'}`}
            size="sm"
            colorClass="bg-slate-100 text-slate-700 border-slate-200"
          />
        ) : null}
        {bookmarkedFilter !== 'any' ? (
          <TagBadge
            label={`星: ${bookmarkedFilter === 'on' ? 'あり' : 'なし'}`}
            size="sm"
            colorClass="bg-slate-100 text-slate-700 border-slate-200"
          />
        ) : null}
        {draftFilter !== 'any' ? (
          <TagBadge
            label={`下書き: ${draftFilter === 'on' ? 'あり' : 'なし'}`}
            size="sm"
            colorClass="bg-slate-100 text-slate-700 border-slate-200"
          />
        ) : null}
      </div>

      <div className="mt-1 text-[11px] text-slate-400 leading-4">
        {tagMatchMode === 'any'
          ? '選んだタグのどれかが付いているカードを表示します。'
          : '選んだタグがすべて付いているカードだけ表示します。'}
      </div>
    </div>
  );
}
