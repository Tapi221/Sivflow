import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CardSyncStatusPill } from "@/components/card/shell/CardSyncStatusPill";
import { overlayGlassPillClassName } from "@/components/card/shell/overlaySurfaceClassNames";
import type { CardDisplayMode } from "@/types/domain/cardSet";

import {
  DISPLAY_MODE_LABELS,
  DISPLAY_MODE_TRIGGER_LABELS,
} from "@/features/cardsetview/domain/cardSetViewConstants";

type CardSetViewOverlayControlsProps = {
  isDesktop: boolean;
  overlayRight: string;
  currentDisplayMode: CardDisplayMode;
  cardSetId?: string | null;
  resolvedLastSyncedAtMs: number | null;
  activeSyncStatus: {
    hasError?: boolean;
    isRetrying?: boolean;
    retry?: (() => void | Promise<void>) | null;
  } | null;
  onRetryActiveSync: () => void;
  onChangeDisplayMode: (mode: CardDisplayMode) => void;
  onSaveCurrentDisplayMode: () => void;
  topInsetPx?: number;
};

export const CardSetViewOverlayControls = ({
  isDesktop,
  overlayRight,
  currentDisplayMode,
  cardSetId,
  resolvedLastSyncedAtMs,
  activeSyncStatus,
  onRetryActiveSync,
  onChangeDisplayMode,
  onSaveCurrentDisplayMode,
  topInsetPx = 0,
}: CardSetViewOverlayControlsProps) => {
  if (!isDesktop) {
    return null;
  }

  const displayModeControl = cardSetId ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`${overlayGlassPillClassName} hover:bg-white/90`}
          aria-label="表示モード"
        >
          {DISPLAY_MODE_TRIGGER_LABELS[currentDisplayMode]}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuItem
          onSelect={() => {
            onChangeDisplayMode("fixed");
          }}
        >
          {currentDisplayMode === "fixed" ? "● " : "○ "}
          {DISPLAY_MODE_LABELS.fixed}
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => {
            onChangeDisplayMode("fluid");
          }}
        >
          {currentDisplayMode === "fluid" ? "● " : "○ "}
          {DISPLAY_MODE_LABELS.fluid}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={() => {
            onSaveCurrentDisplayMode();
          }}
        >
          現在の表示をデフォルトにする
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

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
      {displayModeControl}
    </div>
  );
};