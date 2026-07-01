import React from "react";
import { RefreshCw } from "@web-renderer/chip/icons";
import { LoadingSpinner } from "@web-renderer/components/common/LoadingSpinner";
import { cn } from "@web-renderer/lib/utils";
import { formatLastSyncedAt } from "./formatLastSyncedAt";
import { overlayGlassPillClassName } from "./overlaySurfaceClassNames";



interface CardSyncStatusPillProps {
  lastSyncedAtMs: number | null;
  hasError?: boolean;
  isRetrying?: boolean;
  canRetry?: boolean;
  onRetry?: () => Promise<void> | void;
  className?: string;
}



const CardSyncStatusPill = ({ lastSyncedAtMs, hasError = false, isRetrying = false, canRetry = false, onRetry, className }: CardSyncStatusPillProps) => {
  const label = hasError ? "同期失敗" : `最終同期: ${formatLastSyncedAt(lastSyncedAtMs)}`;

  const retryDisabled = isRetrying || !canRetry || (onRetry === null || onRetry === undefined);

  return (
    <div
      className={cn(
        overlayGlassPillClassName,
        hasError ? "text-rose-500" : "text-[#334155]",
        className,
      )}
    >
      <span className="truncate">{label}</span>
      <button
        type="button"
        className={cn(
          "grid h-5 w-5 place-items-center rounded-full transition",
          retryDisabled ? "cursor-default opacity-40" : "hover:bg-black/5",
        )}
        onClick={() => {
          if (retryDisabled) return;
          void onRetry?.();
        }}
        disabled={retryDisabled}
        aria-label="同期を再試行"
        title="同期を再試行"
      >
        {isRetrying ? (
          <LoadingSpinner iconClassName="h-3.5 w-3.5 border" label="同期を再試行中" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
};



export { CardSyncStatusPill };
