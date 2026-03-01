/**
 * Global Search パネル
 * Ctrl/Cmd + Shift + F で開く、全文検索UI
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { cn } from '@/lib/utils';
import { useCards } from '@/hooks/useCards';
import { useFolders } from '@/hooks/useFolders';
import { useTags } from '@/hooks/useTags';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { buildQuickOpenIndex } from '@/utils/searchIndex';
import { buildFullTextIndex, searchFullText, type FullTextResult, type SearchFilters } from '@/utils/fullTextSearch';
import { highlightMatches } from '@/utils/highlightText';

// アイコン
import SearchIcon from 'lucide-react/dist/esm/icons/search';
import StickyNoteIcon from 'lucide-react/dist/esm/icons/sticky-note';
import FolderIcon from 'lucide-react/dist/esm/icons/folder';
import TagIcon from 'lucide-react/dist/esm/icons/tag';
import XIcon from 'lucide-react/dist/esm/icons/x';
import FilterIcon from 'lucide-react/dist/esm/icons/filter';

interface GlobalSearchPanelProps {
  // Props are managed by CommandPaletteProvider
}

export function GlobalSearchPanel(_props: GlobalSearchPanelProps) {
  const navigate = useNavigate();
  const { 
    isGlobalSearchOpen, 
    closeGlobalSearch, 
    globalSearchInitialQuery,
    globalSearchInitialTagFilter,
    openGlobalSearch 
  } = useCommandPalette();
  
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [typeFilter, setTypeFilter] = useState<'all' | 'card' | 'folder' | 'tag'>('all');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  // データ取得
  const { cards } = useCards();
  const { folders } = useFolders();
  const { tags } = useTags();
  
  // インデックス構築
  const { quickOpenIndex, fullTextIndex } = useMemo(() => {
    const qoIndex = buildQuickOpenIndex(cards || [], folders || [], tags || []);
    const ftIndex = buildFullTextIndex(
      cards || [], 
      folders || [], 
      tags || [],
      qoIndex.folderPathMap
    );
    return { quickOpenIndex: qoIndex, fullTextIndex: ftIndex };
  }, [cards, folders, tags]);
  
  // 検索フィルタ
  const filters: SearchFilters = useMemo(() => ({
    types: typeFilter === 'all' ? undefined : [typeFilter],
    tagFilter: tagFilter || undefined,
  }), [typeFilter, tagFilter]);
  
  // 検索実行（debounce: 150ms）
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);
  
  const results = useMemo(() => {
    return searchFullText(debouncedQuery, fullTextIndex, filters, 50);
  }, [debouncedQuery, fullTextIndex, filters]);
  
  // ダイアログが開いたらフォーカスと初期値設定
  useEffect(() => {
    if (isGlobalSearchOpen) {
      setQuery(globalSearchInitialQuery);
      setTagFilter(globalSearchInitialTagFilter);
      setSelectedIndex(0);
      setTypeFilter('all');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isGlobalSearchOpen, globalSearchInitialQuery, globalSearchInitialTagFilter]);
  
  // 選択インデックスのリセット
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);
  
  // 選択項目が見えるようにスクロール
  useEffect(() => {
    if (listRef.current && results.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, results.length]);
  
  // キーボード操作
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeGlobalSearch();
        break;
    }
  }, [results, selectedIndex, closeGlobalSearch]);
  
  // 項目選択時の処理
  const handleSelect = useCallback((item: FullTextResult) => {
    closeGlobalSearch();
    
    switch (item.type) {
      case 'card':
        navigate(`/CardEdit?id=${item.id}`);
        break;
      case 'folder':
        navigate(`/folders?folderId=${item.id}`);
        break;
      case 'tag':
        // タグをクリックしたらタグでフィルタ
        openGlobalSearch('', item.name);
        break;
    }
  }, [navigate, closeGlobalSearch, openGlobalSearch]);
  
  // アイコン取得
  const getIcon = (type: FullTextResult['type']) => {
    switch (type) {
      case 'card':
        return <StickyNoteIcon className="w-4 h-4 text-blue-500" />;
      case 'folder':
        return <FolderIcon className="w-4 h-4 text-amber-500" />;
      case 'tag':
        return <TagIcon className="w-4 h-4 text-emerald-500" />;
    }
  };
  
  // フィールドラベル
  const getFieldLabel = (field: FullTextResult['matchField']) => {
    switch (field) {
      case 'title': return 'タイトル';
      case 'question': return '問題';
      case 'answer': return '解答';
      case 'code': return 'コード';
      case 'math': return '数式';
      case 'name': return '名前';
      case 'path': return 'パス';
      default: return field;
    }
  };

  return (
    <Dialog open={isGlobalSearchOpen} onOpenChange={(open) => !open && closeGlobalSearch()}>
      <DialogContent 
        className="sm:max-w-[700px] max-h-[80vh] p-0 gap-0 overflow-hidden flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* ヘッダー: 検索入力 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <SearchIcon className="w-5 h-5 text-slate-400 shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="問題、解答、コード、数式を全文検索..."
            className="border-none shadow-none focus-visible:ring-0 text-base placeholder:text-slate-300"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "shrink-0",
              showFilters && "bg-slate-100"
            )}
          >
            <FilterIcon className="w-4 h-4" />
          </Button>
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-100 rounded">
            ESC
          </kbd>
        </div>
        
        {/* フィルタ */}
        {showFilters && (
          <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center gap-2">
            {/* 種別フィルタ */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400 mr-1">種別:</span>
              {(['all', 'card', 'folder', 'tag'] as const).map((type) => (
                <Button
                  key={type}
                  variant={typeFilter === type ? 'default' : 'ghost'}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setTypeFilter(type)}
                >
                  {type === 'all' ? 'すべて' : type === 'card' ? 'カード' : type === 'folder' ? 'フォルダ' : 'タグ'}
                </Button>
              ))}
            </div>
            
            {/* タグフィルタ */}
            {tagFilter && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 cursor-pointer hover:bg-slate-200"
                onClick={() => setTagFilter('')}
              >
                <TagIcon className="w-3 h-3" />
                {tagFilter}
                <XIcon className="w-3 h-3" />
              </Badge>
            )}
          </div>
        )}
        
        {/* 結果リスト */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto py-2"
        >
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-400 text-sm">
              {debouncedQuery ? '結果が見つかりません' : '検索語を入力してください'}
            </div>
          ) : (
            results.map((item, index) => (
              <button
                key={`${item.type}-${item.id}-${item.matchField}`}
                className={cn(
                  "w-full px-4 py-3 flex items-start gap-3 text-left transition-colors",
                  index === selectedIndex
                    ? "bg-primary-50"
                    : "hover:bg-slate-50"
                )}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {/* アイコン */}
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(item.type)}
                </div>
                
                {/* コンテンツ */}
                <div className="flex-1 min-w-0">
                  {/* 名前とパス */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-800 truncate">
                      {item.name}
                    </span>
                    {item.path && (
                      <span className="text-xs text-slate-400 truncate">
                        {item.path}
                      </span>
                    )}
                  </div>
                  
                  {/* スニペット */}
                  <div className="text-sm text-slate-600 line-clamp-2">
                    <Badge variant="outline" className="text-[10px] mr-2 py-0">
                      {getFieldLabel(item.matchField)}
                    </Badge>
                    {highlightMatches(item.snippet, debouncedQuery)}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
        
        {/* フッター */}
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center gap-4 text-[10px] text-slate-400">
          <span>
            {results.length > 0 ? `${results.length}件の結果` : ''}
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-500">Ctrl</kbd>
            +
            <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-500">P</kbd>
            クイックオープン
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
