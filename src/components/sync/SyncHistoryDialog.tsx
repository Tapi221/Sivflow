import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle2 as CheckCircle,
  AlertTriangle,
  AlertCircle as XCircle,
  ChevronUp,
  ChevronDown,
} from "@/ui/icons";
import { getLocalDb } from "@/services/localDB";
import type { SyncHistory } from "@/types";

interface SyncHistoryDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 同期履歴ダイアログ
 * - 直近30件の同期履歴を表示
 * - タイムライン形式
 * - result別カラーバッジ
 * - uploaded/downloaded件数と所要時間を表示
 */
export function SyncHistoryDialog({ open, onClose }: SyncHistoryDialogProps) {
  const [histories, setHistories] = useState<SyncHistory[]>([]);

  const loadHistories = useCallback(async () => {
    try {
      const db = await getLocalDb();
      const allHistories = await db.syncHistory
        .orderBy("finishedAt")
        .reverse()
        .limit(30)
        .toArray();
      queueMicrotask(() => setHistories(allHistories));
    } catch (error) {
      console.error("Failed to load sync histories:", error);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadHistories();
    }
  }, [open, loadHistories]);

  const getResultBadge = (result: string) => {
    switch (result) {
      case "success":
        return (
          <Badge
            className="bg-green-500 hover:bg-green-600"
            variant="secondary"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            成功
          </Badge>
        );
      case "partial":
        return (
          <Badge
            className="bg-yellow-500 hover:bg-yellow-600"
            variant="secondary"
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            部分成功
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500 hover:bg-red-600" variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            失敗
          </Badge>
        );
      case "skipped_wifi":
        return (
          <Badge className="bg-gray-500 hover:bg-gray-600" variant="secondary">
            WiFi待機
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-200 text-gray-800" variant="secondary">
            {result}
          </Badge>
        );
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday =
      new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

    if (isToday) {
      return `今日 ${date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (isYesterday) {
      return `昨日 ${date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      return date.toLocaleString("ja-JP", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  const formatDuration = (startedAt: number, finishedAt: number) => {
    const duration = finishedAt - startedAt;
    if (duration < 1000) {
      return `${duration}ms`;
    } else if (duration < 60000) {
      return `${(duration / 1000).toFixed(1)}秒`;
    } else {
      return `${Math.floor(duration / 60000)}分${Math.round((duration % 60000) / 1000)}秒`;
    }
  };

  const getTimelineColor = (result: string) => {
    switch (result) {
      case "success":
        return "border-green-500";
      case "partial":
        return "border-yellow-500";
      case "failed":
        return "border-red-500";
      case "skipped_wifi":
        return "border-gray-400";
      default:
        return "border-gray-300";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>同期履歴</DialogTitle>
          <DialogDescription>
            過去30件の同期操作の結果を表示しています
          </DialogDescription>
        </DialogHeader>

        {histories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mb-4 opacity-50" />
            <p>履歴がありません</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-1">
              {histories.map((history) => (
                <div
                  key={history.id}
                  className={`border-l-4 ${getTimelineColor(history.result)} pl-4 py-3 hover:bg-gray-50 transition-colors`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {getResultBadge(history.result)}
                      <span className="text-sm text-gray-600">
                        {formatDate(history.startedAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-700">
                      {/* アップロード件数 */}
                      <div className="flex items-center gap-1">
                        <ChevronUp className="w-4 h-4 text-blue-500" />
                        <span>{history.uploaded}件</span>
                      </div>

                      {/* ダウンロード件数 */}
                      <div className="flex items-center gap-1">
                        <ChevronDown className="w-4 h-4 text-green-500" />
                        <span>{history.downloaded}件</span>
                      </div>

                      {/* 所要時間 */}
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>
                          {formatDuration(
                            history.startedAt,
                            history.finishedAt,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}





