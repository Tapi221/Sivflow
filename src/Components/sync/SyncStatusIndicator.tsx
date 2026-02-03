import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  AlertCircle,
  History,
  Settings,
  AlertTriangle,
  MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SyncErrorDialog } from './SyncErrorDialog';
import { SyncHistoryDialog } from './SyncHistoryDialog';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';

/**
 * 同期状態を表示し、手動同期をトリガーできるコンポーネント
 * 高度化機能:
 * - エラーダイアログへのアクセス
 * - 履歴ダイアログへのアクセス
 * - 競合解決ダイアログへのアクセス
 * - キュー件数表示
 */

interface SyncStatusIndicatorProps {
  className?: string;
  showText?: boolean;
  dropdownAlign?: "center" | "end" | "start";
  dropdownSide?: "top" | "right" | "bottom" | "left";
}

export function SyncStatusIndicator({ 
  className, 
  showText, 
  dropdownAlign = "end", 
  dropdownSide = "bottom" 
}: SyncStatusIndicatorProps) {
  const { syncStatus, lastSyncTime, triggerSync, queueCount, conflictCount } = useAuth();
  
  // ダイアログ状態
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  // ... (existing helper functions getStatusIcon, getStatusText, getStatusColor)
  // Re-declare them here or keep them if they were inside component. 
  // Since I am replacing the top part, I need to be careful to keep the internal logic.
  // Actually, I should use a smaller replace block to just change the signature and add props usage.

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'success':
        return <Check className="w-4 h-4 text-primary-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Cloud className="w-4 h-4" />;
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return '同期中...';
      case 'success':
        if (!lastSyncTime) return '同期完了';
        
        const date = new Date(lastSyncTime);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();
        
        const timeStr = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        
        if (isToday) {
          return `最終同期：今日 ${timeStr}`;
        } else if (isYesterday) {
          return `最終同期：昨日 ${timeStr}`;
        } else {
          const dateStr = date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
          return `最終同期：${dateStr} ${timeStr}`;
        }
      case 'error':
        return '同期エラー';
      default:
        return '同期待機中';
    }
  };

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'text-blue-600 dark:text-blue-400';
      case 'success':
        return 'text-primary-600';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const handleStatusClick = () => {
    if (syncStatus === 'error') {
      setErrorDialogOpen(true);
    }
  };

  // Logic to determine if text should be shown
  // If showText is undefined, use existing logic (hidden lg:inline)
  // If provided, use it.
  const textClass = showText === undefined 
      ? "hidden lg:inline text-[11px] font-medium tracking-tight"
      : showText 
          ? "text-[11px] font-medium tracking-tight" 
          : "hidden";

  return (
    <>
    <div className={cn("flex items-center gap-1", className)}>
      {/* 状態表示 */}
      <div
        onClick={handleStatusClick}
        title={getStatusText()}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all duration-200',
          getStatusColor(),
          syncStatus === 'error' ? 'cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20' : 'cursor-default'
        )}
      >
        <div className="relative flex items-center justify-center">
          {getStatusIcon()}
          {syncStatus === 'syncing' && (
            <span className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-20"></span>
          )}
        </div>
        <span className={textClass}>
          {getStatusText()}
        </span>
      </div>

      {/* オフライン表示 */}
      {!navigator.onLine && (
        <div 
          className="flex items-center gap-1 px-2 py-1.5 text-orange-600 dark:text-orange-400"
          title="オフライン状態です"
        >
          <CloudOff className="w-3.5 h-3.5" />
        </div>
      )}

      {/* キュー/競合表示 (バッジ) */}
      {(queueCount > 0 || conflictCount > 0) && (
        <div className="flex items-center gap-1 ml-1">
          {queueCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-slate-100 text-slate-600 border-none">
              {queueCount}
            </Badge>
          )}
          {conflictCount > 0 && (
            <Badge
              variant="destructive"
              className="h-5 px-1.5 text-[10px] cursor-pointer animate-pulse"
              onClick={() => setConflictDialogOpen(true)}
              title={`${conflictCount}件の競合があります`}
            >
              <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
              {conflictCount}
            </Badge>
          )}
        </div>
      )}

      {/* アクション群 */}
      <div className="flex items-center ml-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={triggerSync}
          disabled={syncStatus === 'syncing' || !navigator.onLine}
          className="h-8 w-8 text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
          title="今すぐ同期"
        >
          <RefreshCw
            className={cn(
              'w-3.5 h-3.5',
              syncStatus === 'syncing' && 'animate-spin'
            )}
          />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={dropdownAlign} side={dropdownSide} className="w-48">
            <DropdownMenuItem onClick={() => setHistoryDialogOpen(true)}>
              <History className="w-4 h-4 mr-2" />
              同期履歴
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setErrorDialogOpen(true)}>
              <AlertCircle className="w-4 h-4 mr-2" />
              エラー詳細
            </DropdownMenuItem>
            {conflictCount > 0 && (
              <DropdownMenuItem onClick={() => setConflictDialogOpen(true)}>
                <AlertTriangle className="w-4 h-4 mr-2" />
                競合解決 ({conflictCount}件)
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/sync-settings">
                <Settings className="w-4 h-4 mr-2" />
                同期設定
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

      {/* ダイアログ */}
      <SyncErrorDialog open={errorDialogOpen} onClose={() => setErrorDialogOpen(false)} />
      <SyncHistoryDialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} />
      <ConflictResolutionDialog open={conflictDialogOpen} onClose={() => setConflictDialogOpen(false)} />
    </>
  );
}
