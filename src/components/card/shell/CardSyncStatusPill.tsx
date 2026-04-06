import React from "react";

import { cn } from "@/lib/utils";
import { RefreshCw } from "@/ui/icons";

interface CardSyncStatusPillProps {
  lastSyncedAtMs: number | null;
  hasError?: boolean;
  isRetrying?: boolean;
  canRetry?: boolean;
  onRetry?: () => Promise<void> | void;
  className?: string;
}

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const formatLastSyncedAt = (lastSyncedAtMs: number | null) => {
  if (lastSyncedAtMs == null || !Number.isFinite(lastSyncedAtMs)) {
    return "未同期";
  }

  const date = new Date(lastSyncedAtMs);
  if (Number.isNaN(date.getTime())) {
    return "未同期";
  }

  const now = new Date();
  const timeLabel = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  if (isSameDay(date, now)) {
    return `今日 ${timeLabel}`;
  }

  const dateLabel = new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return `${dateLabel} ${timeLabel}`;
};

export const CardSyncStatusPill = ({
  lastSyncedAtMs,
  hasError = false,
  isRetrying = false,
  canRetry = false,
  onRetry,
  className,
}: CardSyncStatusPillProps) => {
  const label = hasError
    ? "同期失敗"
    : `最終同期: ${formatLastSyncedAt(lastSyncedAtMs)}`;

  const retryDisabled = (!canRetry && !isRetrying) || onRetry == null;

  return (
    <div
      className={cn(
        "pointer-events-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--sidebar-bg)] px-3 text-xs font-medium surface-control-convex",
        hasError ? "text-rose-500" : "text-[#334155]",
        className,
      )}
    >
      <span className="truncate">{label}</span>

      <button
        type="button"
        className={cn(
          "grid h-5 w-5 place-items-center rounded-full transition",
          retryDisabled && !isRetrying
            ? "cursor-default opacity-40"
            : "hover:bg-black/5",
        )}
        onClick={() => {
          if (retryDisabled) return;
          void onRetry?.();
        }}
        disabled={retryDisabled}
        aria-label="同期を再試行"
        title="同期を再試行"
      >
        <RefreshCw
          className={cn("h-3.5 w-3.5", isRetrying && "animate-spin")}
        />
      </button>
    </div>
  );
};