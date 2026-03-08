/**
 * Quick Open ダイアログ
 * Ctrl/Cmd + P で開く、カード/フォルダ/タグの曖昧検索UI
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCards } from "@/hooks/card/useCards";
import { useFolders } from "@/hooks/folder/useFolders";
import { useTags, resolveCardTagNames } from "@/hooks/settings/useTags";
import { useCommandPalette } from "@/hooks/ui/useCommandPalette";
import {
  buildQuickOpenIndex,
  searchQuickOpen,
  type QuickOpenItem,
} from "@/utils/searchIndex";
import { highlightMatches } from "@/utils/highlightText";

// アイコン
import { Search } from "@/ui/icons";
import { StickyNote } from "@/ui/icons";
import { Folder as FolderIcon } from "@/ui/icons";
import { Tag as TagIcon } from "@/ui/icons";
export function QuickOpenDialog() {
  const navigate = useNavigate();
  const { isQuickOpenOpen, closeQuickOpen, openGlobalSearch } =
    useCommandPalette();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // データ取得
  const { cards } = useCards();
  const { folders } = useFolders();
  const { tags, tagById } = useTags();

  // タグごとのカード数を計算（tagIds 優先、fallback: card.tags）
  const cardTagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of cards || []) {
      for (const name of resolveCardTagNames(card.tagIds, card.tags, tagById)) {
        counts.set(name, (counts.get(name) || 0) + 1);
      }
    }
    return counts;
  }, [cards, tagById]);

  // インデックス構築
  const index = useMemo(() => {
    return buildQuickOpenIndex(
      cards || [],
      folders || [],
      tags || [],
      cardTagCounts,
    );
  }, [cards, folders, tags, cardTagCounts]);

  // 検索実行（debounce不要、入力ごとに即時検索）
  const results = useMemo(() => {
    return searchQuickOpen(query, index, 20);
  }, [query, index]);

  // ダイアログが開いたらフォーカス
  useEffect(() => {
    if (isQuickOpenOpen) {
      queueMicrotask(() => {
        setQuery("");
        setSelectedIndex(0);
      });
      // 少し遅延してフォーカス
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isQuickOpenOpen]);

  // 選択インデックスのリセット
  useEffect(() => {
    queueMicrotask(() => setSelectedIndex(0));
  }, [results]);

  // 選択項目が見えるようにスクロール
  useEffect(() => {
    if (listRef.current && results.length > 0) {
      const selectedElement = listRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, results.length]);

  // 項目選択時の処理
  const handleSelect = useCallback(
    (item: QuickOpenItem) => {
      closeQuickOpen();

      switch (item.type) {
        case "card":
          // カード編集画面へ遷移
          navigate(`/CardEdit?id=${item.id}`);
          break;
        case "folder":
          // フォルダ画面へ遷移（将来的にはフォルダを選択状態に）
          navigate(`/folders?folderId=${item.id}`);
          break;
        case "tag":
          // 全文検索を開き、タグでフィルタ
          openGlobalSearch("", item.name);
          break;
      }
    },
    [navigate, closeQuickOpen, openGlobalSearch],
  );
  // キーボード操作
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          closeQuickOpen();
          break;
      }
    },
    [results, selectedIndex, closeQuickOpen, handleSelect],
  );

  // アイコン取得
  const getIcon = (type: QuickOpenItem["type"]) => {
    switch (type) {
      case "card":
        return <StickyNote className="w-4 h-4 text-blue-500" />;
      case "folder":
        return <FolderIcon className="w-4 h-4 text-amber-500" />;
      case "tag":
        return <TagIcon className="w-4 h-4 text-emerald-500" />;
    }
  };

  // 種別ラベル
  const getTypeLabel = (type: QuickOpenItem["type"]) => {
    switch (type) {
      case "card":
        return "カード";
      case "folder":
        return "フォルダ";
      case "tag":
        return "タグ";
    }
  };

  return (
    <Dialog
      open={isQuickOpenOpen}
      onOpenChange={(open) => !open && closeQuickOpen()}
    >
      <DialogContent
        className="sm:max-w-[600px] p-0 gap-0 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* 検索入力欄 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="カード、フォルダ、タグを検索..."
            className="border-none shadow-none focus-visible:ring-0 text-base placeholder:text-slate-300"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-100 rounded">
            ESC
          </kbd>
        </div>

        {/* 結果リスト */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-400 text-sm">
              {query ? "結果が見つかりません" : "検索語を入力してください"}
            </div>
          ) : (
            results.map((item, index) => (
              <button
                key={`${item.type}-${item.id}`}
                className={cn(
                  "w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors",
                  index === selectedIndex
                    ? "bg-primary-50"
                    : "hover:bg-slate-50",
                )}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {/* アイコン */}
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                  {getIcon(item.type)}
                </div>

                {/* 名前と補助情報 */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 truncate">
                    {highlightMatches(item.name, query)}
                  </div>
                  {item.path && (
                    <div className="text-xs text-slate-400 truncate">
                      {highlightMatches(item.path, query)}
                    </div>
                  )}
                </div>

                {/* 種別バッジ */}
                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                  {getTypeLabel(item.type)}
                </span>
              </button>
            ))
          )}
        </div>

        {/* フッター */}
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center gap-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-500">
              ↑↓
            </kbd>
            選択
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-500">
              Enter
            </kbd>
            開く
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-500">
              Ctrl
            </kbd>
            +
            <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-500">
              Shift
            </kbd>
            +
            <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-500">
              F
            </kbd>
            全文検索
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}








