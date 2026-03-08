import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  AlertCircle,
  History,
  AlertTriangle,
  MoreVertical,
} from "@/ui/icons";
import { cn } from "@/lib/utils";
import { SyncErrorDialog } from "./SyncErrorDialog";
import { SyncHistoryDialog } from "./SyncHistoryDialog";
import { ConflictResolutionDialog } from "./ConflictResolutionDialog";

/**
 * 同期状態を表示し、手動同期をトリガーできるコンポーネント
 */

interface SyncStatusIndicatorProps {
  className?: string;
  showText?: boolean;
  dropdownAlign?: "center" | "end" | "start";
  dropdownSide?: "top" | "right" | "bottom" | "left";
  compact?: boolean; // compactモード：アイコンのみ表示
}

export function SyncStatusIndicator({
  className,
  dropdownAlign = "end",
  dropdownSide = "bottom",
  compact = false,
}: SyncStatusIndicatorProps) {
  const {
    syncStatus,
    syncNotice,
    lastSyncTime,
    triggerSync,
    queueCount,
    conflictCount,
  } = useAuth();

  // 折りたたみ状態
  const [isExpanded, setIsExpanded] = useState(false);

  // 同期中やエラー時は自動で展開する（compactモードでは無効）
  useEffect(() => {
    if (compact) return; // compact時は自動展開しない
    if (
      syncStatus === "syncing" ||
      syncStatus === "error" ||
      conflictCount > 0
    ) {
      queueMicrotask(() => setIsExpanded(true));
    }
  }, [syncStatus, conflictCount, compact]);

  // ダイアログ状態
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  const getStatusIcon = () => {
    if (syncNotice === "wifi_wait") {
      return <Cloud className="w-4 h-4 text-amber-500" />;
    }
    switch (syncStatus) {
      case "syncing": {
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      }
      case "success": {
        return <Check className="w-4 h-4 text-primary-600" />;
      }
      case "error": {
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      }
      default: {
        return <Cloud className="w-4 h-4 text-slate-400" />;
      }
    }
  };

  const getStatusText = () => {
    if (syncNotice === "wifi_wait") {
      return "Wi-Fi待機中";
    }
    switch (syncStatus) {
      case "syncing": {
        return "同期中...";
      }
      case "success": {
        if (!lastSyncTime) return "同期完了";

        const date = new Date(lastSyncTime);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        const timeStr = date.toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
        });

        if (isToday) {
          return `最終同期：今日 ${timeStr}`;
        } else if (isYesterday) {
          return `最終同期：昨日 ${timeStr}`;
        } else {
          const dateStr = date.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
          return `最終同期：${dateStr} ${timeStr}`;
        }
      }
      case "error": {
        return "同期エラー";
      }
      default: {
        return "同期待機中";
      }
    }
  };

  const getStatusColor = () => {
    if (syncNotice === "wifi_wait") {
      return "text-amber-600";
    }
    switch (syncStatus) {
      case "syncing": {
        return "text-blue-600";
      }
      case "success": {
        return "text-primary-600";
      }
      case "error": {
        return "text-red-600";
      }
      default: {
        return "text-gray-600";
      }
    }
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center p-0.5 rounded-full cursor-pointer transition-all duration-300 motion-reduce:transition-none",
          "bg-[var(--sidebar-bg)] surface-control-convex",
          compact &&
            "p-0 bg-transparent backdrop-blur-none border-none shadow-none", // compact時はシンプルに
          className,
        )}
      >
        {/* メインのアイコン＆ステータス部分 */}
        <div
          onClick={() => !compact && setIsExpanded(!isExpanded)}
          className={cn(
            "flex items-center gap-2 px-2.5 py-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none",
            compact && "px-1.5 py-1 gap-0", // compact時は小さく
            getStatusColor(),
          )}
        >
          <div className="relative flex items-center justify-center shrink-0">
            {getStatusIcon()}
            {syncStatus === "syncing" && (
              <span className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-20"></span>
            )}
          </div>

          <AnimatePresence mode="wait">
            {isExpanded && !compact && (
              <motion.div
                layout
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="overflow-hidden whitespace-nowrap flex items-center gap-2"
              >
                <span className="text-[11px] font-bold tracking-tight">
                  {getStatusText()}
                </span>

                {/* オフライン表示 */}
                {!navigator.onLine && (
                  <div className="flex items-center gap-1 px-1 text-orange-600">
                    <CloudOff className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* キュー/競合表示 (バッジ) */}
                {(queueCount > 0 || conflictCount > 0) && (
                  <div className="flex items-center gap-1 px-1">
                    {queueCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="h-5 px-1.5 text-[10px] bg-white/40 text-slate-600 border-none shadow-sm"
                      >
                        {queueCount}
                      </Badge>
                    )}
                    {conflictCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="h-5 px-1.5 text-[10px] cursor-pointer animate-pulse"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConflictDialogOpen(true);
                        }}
                      >
                        <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                        {conflictCount}
                      </Badge>
                    )}
                  </div>
                )}

                {/* セパレーター */}
                <div className="w-[1px] h-3 bg-[var(--sidebar-border)] mx-1" />

                {/* アクション群 */}
                <div
                  className="flex items-center gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={triggerSync}
                    disabled={syncStatus === "syncing" || !navigator.onLine}
                    className="h-7 w-7 text-[#334155] hover:text-primary-600 hover:bg-[var(--sidebar-active-bg)] rounded-full transition-colors"
                  >
                    <RefreshCw
                      className={cn(
                        "w-3.5 h-3.5",
                        syncStatus === "syncing" && "animate-spin",
                      )}
                    />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-[#334155] hover:text-[#334155] hover:bg-[var(--sidebar-active-bg)] rounded-full"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align={dropdownAlign}
                      side={dropdownSide}
                      className="w-48"
                    >
                      <DropdownMenuItem
                        onClick={() => setHistoryDialogOpen(true)}
                      >
                        <History className="w-4 h-4 mr-2" />
                        同期履歴
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setErrorDialogOpen(true)}
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        エラー詳細
                      </DropdownMenuItem>
                      {conflictCount > 0 && (
                        <DropdownMenuItem
                          onClick={() => setConflictDialogOpen(true)}
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          競合解決 ({conflictCount}件)
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ダイアログ */}
      <SyncErrorDialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
      />
      <SyncHistoryDialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
      />
      <ConflictResolutionDialog
        open={conflictDialogOpen}
        onClose={() => setConflictDialogOpen(false)}
      />
    </>
  );
}



