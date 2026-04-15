import { CardSyncStatusPill } from "@/components/card/shell/CardSyncStatusPill";

type CardSetViewOverlayControlsProps = {
  isDesktop: boolean;
  overlayRight: string;
  resolvedLastSyncedAtMs: number | null;
  activeSyncStatus: {
    hasError?: boolean;
    isRetrying?: boolean;
    retry?: (() => void | Promise<void>) | null;
  } | null;
  onRetryActiveSync: () => void;
  topInsetPx?: number;
};

export const CardSetViewOverlayControls = ({
  isDesktop,
  overlayRight,
  resolvedLastSyncedAtMs,
  activeSyncStatus,
  onRetryActiveSync,
  topInsetPx = 0,
}: CardSetViewOverlayControlsProps) => {
  if (!isDesktop) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute z-20 flex items-center gap-2"
      style={{
        top: `${topInsetPx + 12}px`,
        right: overlayRight,
        transform: "none",
      }}
    >
      <CardSyncStatusPill
        lastSyncedAtMs={resolvedLastSyncedAtMs}
        hasError={activeSyncStatus?.hasError ?? false}
        isRetrying={activeSyncStatus?.isRetrying ?? false}
        canRetry={activeSyncStatus?.retry != null}
        onRetry={onRetryActiveSync}
      />
    </div>
  );
};
