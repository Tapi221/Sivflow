import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "@/ui/icons";
import { getLocalDb } from "@/services/localDB";
import { useSyncContext } from "@/contexts/sync/SyncContext";
import type { SyncError } from "@/types";

interface SyncErrorDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 同期エラー詳細表示ダイアログ
 * - エラー一覧（phase別カラーコード）
 * - メッセージ、スタック、occurredAt、retryCount表示
 * - retryable=trueのみリトライボタン表示
 * - リトライ失敗時は同じエラーIDで更新
 * - 全エラークリアボタン
 */
export const SyncErrorDialog = ({ open, onClose }: SyncErrorDialogProps) => {
  const [errors, setErrors] = useState<SyncError[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const { clearSyncErrors, triggerSync } = useSyncContext();

  const loadErrors = useCallback(async () => {
    try {
      const db = await getLocalDb();
      const allErrors = await db.syncErrors
        .orderBy("occurredAt")
        .reverse()
        .toArray();
      setErrors(allErrors);
    } catch (error) {
      console.error("Failed to load sync errors:", error);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadErrors();
    }
  }, [open, loadErrors]);

  const handleRetry = async (errorId: string) => {
    setRetrying(errorId);
    try {
      await triggerSync();
      await loadErrors();
    } finally {
      setRetrying(null);
    }
  };

  const handleClearAll = async () => {
    await clearSyncErrors();
    setErrors([]);
  };

  const handleClearOne = async (errorId: string) => {
    const db = await getLocalDb();
    await db.syncErrors.delete(errorId);
    await loadErrors();
  };

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "upload":
        return "bg-blue-500 hover:bg-blue-600";
      case "download":
        return "bg-green-500 hover:bg-green-600";
      case "merge":
        return "bg-purple-500 hover:bg-purple-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case "upload":
        return "アップロード";
      case "download":
        return "ダウンロード";
      case "merge":
        return "マージ";
      default:
        return phase;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            同期エラー詳細
          </DialogTitle>
          <DialogDescription>
            同期中に発生したエラーの詳細を確認し、リトライできます
          </DialogDescription>
        </DialogHeader>

        {errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
            <p>エラーはありません</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-600">
                {errors.length}件のエラー
              </span>
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                <Trash2 className="w-4 h-4 mr-2" />
                全てクリア
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {errors.map((error) => (
                <div key={error.id} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getPhaseColor(error.phase)}>
                        {getPhaseLabel(error.phase)}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {formatDate(error.occurredAt)}
                      </span>
                      {error.retryCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-orange-600 border-orange-300"
                        >
                          リトライ {error.retryCount}回
                        </Badge>
                      )}
                      {!error.retryable && (
                        <Badge variant="destructive">リトライ不可</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {error.retryable && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(error.id)}
                          disabled={retrying === error.id}
                        >
                          {retrying === error.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleClearOne(error.id)}
                      >
                        <Trash2 className="w-4 h-4 text-gray-400" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm font-medium mt-2 text-gray-800">
                    {error.message}
                  </p>

                  {error.stack && (
                    <div className="mt-2">
                      <button
                        onClick={() => toggleExpanded(error.id)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        {expandedId === error.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        スタックトレース
                      </button>
                      {expandedId === error.id && (
                        <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto max-h-40 overflow-y-auto">
                          {error.stack}
                        </pre>
                      )}
                    </div>
                  )}

                  {!error.retryable && (
                    <p className="text-xs text-red-600 mt-2">
                      ※
                      このエラーは3回リトライに失敗したため、自動リトライは無効です
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
