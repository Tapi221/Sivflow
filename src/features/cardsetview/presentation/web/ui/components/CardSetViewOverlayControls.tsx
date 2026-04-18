import type { CardSyncStatusSnapshot } from "@/components/card/shell/cardSyncStatus";
import { CardSyncStatusPill } from "@/components/card/shell/CardSyncStatusPill";

type CardSetViewOverlayControlsProps = {
  isDesktop: boolean;
  overlayRight: string;
  resolvedLastSyncedAtMs: number | null;
  activeSyncStatus: CardSyncStatusSnapshot | null;
  onRetryActiveSync: () => Promise<void>;
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
        canRetry={activeSyncStatus?.canRetry ?? false}
        onRetry={onRetryActiveSync}
      />
    </div>
  );
};
