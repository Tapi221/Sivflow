/**
 * State panel shown in place of the viewer when slides are not ready.
 * Handles: offline, pending, failed, upload-pending, manifest-error states.
 * Fully props-driven, no internal state.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { FileWarning, Loader2, RefreshCw } from "@/ui/icons";

interface PowerPointPaneStateProps {
  offlineWithoutReadyManifest: boolean;
  manifestPending: boolean;
  manifestStatus: string;
  manifestError: string | null;
  conversionError: string | null;
  conversionErrorLabel: string;
  uploadStatus: string | undefined;
  isOnline: boolean;
  hasScheduledAutoRetry: boolean;
  hasReachedAutoRetryLimit: boolean;
  nextRetryLabel: string | null;
  canOpenSource: boolean;
  onRetry: () => void;
  onOpenSource: () => void;
}

export function PowerPointPaneState({
  offlineWithoutReadyManifest,
  manifestPending,
  manifestStatus,
  manifestError,
  conversionError,
  conversionErrorLabel,
  uploadStatus,
  isOnline,
  hasScheduledAutoRetry,
  hasReachedAutoRetryLimit,
  nextRetryLabel,
  canOpenSource,
  onRetry,
  onOpenSource,
}: PowerPointPaneStateProps) {
  if (offlineWithoutReadyManifest) {
    return (
      <div className="p-4 text-sm text-slate-600 space-y-3">
        <div className="flex items-center gap-2">
          <FileWarning className="w-4 h-4 text-slate-500" />
          オフラインのため変換を開始できません。オンライン復帰後に再試行されます。
        </div>
        {canOpenSource && (
          <Button variant="outline" size="sm" onClick={onOpenSource}>
            原本を開く
          </Button>
        )}
      </div>
    );
  }

  if (
    manifestPending ||
    manifestStatus === "queued" ||
    manifestStatus === "processing"
  ) {
    return (
      <div className="p-4 text-sm text-slate-600 space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
          {manifestPending
            ? "変換結果の生成を待機しています..."
            : "PowerPoint を変換中です..."}
        </div>
        {canOpenSource && (
          <Button variant="outline" size="sm" onClick={onOpenSource}>
            原本を開く
          </Button>
        )}
      </div>
    );
  }

  if (manifestStatus === "failed") {
    return (
      <div className="p-4 text-sm text-rose-600 space-y-3">
        <div className="flex items-center gap-2">
          <FileWarning className="w-4 h-4" />
          変換に失敗しました。
          {conversionError ? `(${conversionErrorLabel})` : ""}
        </div>
        {hasScheduledAutoRetry && nextRetryLabel && (
          <div className="text-xs text-slate-600">
            自動再試行予定: {nextRetryLabel}
          </div>
        )}
        {hasReachedAutoRetryLimit && (
          <div className="text-xs text-slate-600">
            自動再試行の上限に達しました。再試行ボタンで再開できます。
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={!isOnline}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            再試行
          </Button>
          {canOpenSource && (
            <Button variant="outline" size="sm" onClick={onOpenSource}>
              原本を開く
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (uploadStatus !== "ready") {
    return (
      <div className="p-4 text-sm text-slate-600">
        原本のアップロード完了後に変換を開始します。
      </div>
    );
  }

  if (manifestError) {
    return (
      <div className="p-4 text-sm text-rose-600 space-y-3">
        <div className="flex items-center gap-2">
          <FileWarning className="w-4 h-4" />
          {manifestError}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={!isOnline}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            再試行
          </Button>
          {canOpenSource && (
            <Button variant="outline" size="sm" onClick={onOpenSource}>
              原本を開く
            </Button>
          )}
        </div>
      </div>
    );
  }

  return <div className="p-4 text-sm text-slate-500">変換準備中です...</div>;
}





