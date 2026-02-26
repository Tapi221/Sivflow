/**
 * ExplorerTabs - Explorerタブ切替UIコンポーネント
 */
import React from 'react';
import { Folder, Clock } from 'lucide-react';
import Pin from 'lucide-react/dist/esm/icons/pin';
import FolderPlus from 'lucide-react/dist/esm/icons/folder-plus';
import { cn } from '@/lib/utils';
import type { ExplorerTab } from '@/hooks/useExplorerStore';
import { TagFilterPopover } from './TagFilterPopover';

interface ExplorerTabsProps {
  activeTab: ExplorerTab;
  onTabChange: (tab: ExplorerTab) => void;
  allTags: string[];
  onCreateRootFolder?: () => void | Promise<void>;
  showExplorerActions?: boolean;
}

// タブ定義
const TABS: { id: ExplorerTab; label: string; icon: React.ElementType }[] = [
  { id: 'pinned', label: 'ピン留め', icon: Pin },
  { id: 'explorer', label: 'エクスプローラー', icon: Folder },
  { id: 'recent', label: '最近', icon: Clock },
];

export function ExplorerTabs({
  activeTab,
  onTabChange,
  allTags,
  onCreateRootFolder,
  showExplorerActions = false,
}: ExplorerTabsProps) {
  const shouldShowExplorerActions = showExplorerActions && activeTab === 'explorer';

  return (
    <div className={cn(
      "flex items-center justify-between border-b border-slate-200 bg-slate-50/50 pr-2 h-9",
      // 左上の固定ハンバーガーボタンと重ならないよう、全画面幅で左余白を確保する。
      "pl-10"
    )}>
      <div className="flex items-center flex-1 overflow-x-auto no-scrollbar">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              title={tab.label}
              className={cn(
                "flex items-center justify-center px-2 py-1 text-xs font-medium transition-colors relative whitespace-nowrap",
                "hover:text-primary-600",
                isActive 
                  ? "text-primary-600" 
                  : "text-slate-500"
              )}
            >
              <Icon className="w-4 h-4" />
              {/* スクリーンリーダー用にラベルは保持し、視覚的に隠す */}
              <span className="sr-only">{tab.label}</span>
              {/* アクティブインジケーター */}
              {isActive && (
                <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-primary-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* フィルタボタン (Explorerのみ表示) */}
      <div
        className={cn(
          "flex items-center gap-1 flex-shrink-0 overflow-hidden transition-all duration-200 ease-out",
          shouldShowExplorerActions
            ? "ml-1 pl-1 border-l border-slate-200 opacity-100 translate-x-0 max-w-[120px]"
            : "ml-0 pl-0 border-l-0 opacity-0 translate-x-1 max-w-0 pointer-events-none"
        )}
        aria-hidden={!shouldShowExplorerActions}
      >
          <button
            type="button"
            onClick={() => {
              void onCreateRootFolder?.();
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary-600"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <TagFilterPopover allTags={allTags} />
      </div>
    </div>
  );
}
