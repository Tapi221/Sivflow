/**
 * ExplorerTabs - Explorerタブ切替UIコンポーネント
 */
import React from 'react';
import { Bookmark, Folder, Clock, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExplorerTab } from '@/hooks/useExplorerStore';
import { TagFilterPopover } from './TagFilterPopover';

interface ExplorerTabsProps {
  activeTab: ExplorerTab;
  onTabChange: (tab: ExplorerTab) => void;
  allTags: string[];
}

// タブ定義
const TABS: { id: ExplorerTab; label: string; icon: React.ElementType }[] = [
  { id: 'favorites', label: 'お気に入り', icon: Bookmark },
  { id: 'explorer', label: 'エクスプローラー', icon: Folder },
  { id: 'recent', label: '最近', icon: Clock },
  { id: 'inbox', label: '受信箱', icon: FileText },
];

export function ExplorerTabs({ activeTab, onTabChange, allTags }: ExplorerTabsProps) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-1 pr-2">
      <div className="flex items-center flex-1 overflow-x-auto no-scrollbar">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors relative whitespace-nowrap",
                "hover:text-primary-600",
                isActive 
                  ? "text-primary-600" 
                  : "text-slate-500"
              )}
              title={tab.label}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline truncate max-w-[60px]">{tab.label}</span>
              {/* アクティブインジケーター */}
              {isActive && (
                <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-primary-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* フィルタボタン (ExplorerとInboxのみ表示) */}
      {(activeTab === 'explorer' || activeTab === 'inbox') && (
        <div className="flex-shrink-0 ml-1 border-l border-slate-200 pl-1">
          <TagFilterPopover allTags={allTags} />
        </div>
      )}
    </div>
  );
}
