import type { CardSyncStatus } from "@/components/card/shell/cardSyncStatus";
import { Flashcard } from "@/components/card/frame/Flashcard";
import { CardEditorPane } from "@/components/folder/panes/CardEditorPane";
import type { Card, UserSettings } from "@/types";
import type { CardDisplayMode } from "@/types/domain/cardSet";
import React from "react";

export interface DesktopCardSurfaceProps {
  card: Card;
  isActive: boolean;
  isGlobalEditing: boolean;
  editPaneWidthPx: number;
  settings?: Partial<UserSettings> | null;
  isFlipped: boolean;
  currentDisplayMode: CardDisplayMode;
  viewZoomScale: number;
  folderId: string | null;
  cardSetId: string | null;
  cardsOverride?: Card[];
  onFlip: () => void;
  onToggleUncertainty: (card: Card) => void | Promise<void>;
  onToggleBookmark: (card: Card) => void | Promise<void>;
  onSyncStatusChange: (status: CardSyncStatus | null) => void;
}

const DesktopCardSurfaceInner = ({
  card,
  isActive,
  isGlobalEditing,
  editPaneWidthPx,
  settings = null,
  isFlipped,
  currentDisplayMode,
  viewZoomScale,
  folderId,
  cardSetId,
  cardsOverride,
  onFlip,
  onToggleUncertainty,
  onToggleBookmark,
  onSyncStatusChange,
}: DesktopCardSurfaceProps) => {
  const [hasFocusWithin, setHasFocusWithin] = React.useState(false);

  const handleEditorFocusCapture = React.useCallback(() => {
    setHasFocusWithin(true);
  }, []);

  const handleEditorBlurCapture = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const nextFocused = event.relatedTarget as Node | null;
      if (!nextFocused || !event.currentTarget.contains(nextFocused)) {
        setHasFocusWithin(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    if (isGlobalEditing) return;
    setHasFocusWithin(false);
  }, [isGlobalEditing]);

  const canInteractWithEditor = isGlobalEditing && (isActive || hasFocusWithin);

  const handleSyncStatusForward = React.useCallback(
    (status: CardSyncStatus | null) => {
      if (!canInteractWithEditor) return;
      onSyncStatusChange(status);
    },
    [canInteractWithEditor, onSyncStatusChange],
  );

  React.useEffect(() => {
    if (canInteractWithEditor) return;
    onSyncStatusChange(null);
  }, [canInteractWithEditor, onSyncStatusChange]);

  if (isGlobalEditing) {
    return (
      <div
        className="w-full overflow-visible"
        onFocusCapture={handleEditorFocusCapture}
        onBlurCapture={handleEditorBlurCapture}
        style={
          !isActive && !hasFocusWithin
            ? { pointerEvents: "none", userSelect: "none" }
            : undefined
        }
      >
        <CardEditorPane
          selectedCardId={card.id}
          folderId={folderId || undefined}
          cardSetId={cardSetId || undefined}
          forcedPaneWidthPx={editPaneWidthPx}
          cardsOverride={cardsOverride}
          autoEdit
          hideMetaPanel
          dockToolbarsToTop
          hideBlockToolbars={!canInteractWithEditor}
          embeddedInPager
          presentationContext={{
            isCurrentCard: isActive,
            isStandaloneEditor: false,
            hasFocusWithin,
          }}
          settingsOverride={settings}
          pairGapClassName="gap-4"
          showResizeHandle={canInteractWithEditor}
          onSyncStatusChange={handleSyncStatusForward}
        />
      </div>
    );
  }

  return (
    <div className="w-full overflow-visible">
      <Flashcard
        card={card}
        isFlipped={isFlipped}
        previewMode={!isActive}
        displayMode={currentDisplayMode}
        showInkLayer={currentDisplayMode === "fixed"}
        inkEditingEnabled={currentDisplayMode === "fixed" && isActive}
        onFlip={isActive ? onFlip : undefined}
        onToggleUncertainty={isActive ? onToggleUncertainty : undefined}
        onToggleBookmark={isActive ? onToggleBookmark : undefined}
        allowUpscale={false}
        scaleMultiplier={1}
        fixedScale={currentDisplayMode === "fixed" ? viewZoomScale : undefined}
        contentZoom={currentDisplayMode === "fluid" ? viewZoomScale : 1}
        cardShellClassName={
          currentDisplayMode === "fluid"
            ? "border-none bg-transparent shadow-none"
            : undefined
        }
      />
    </div>
  );
};

const areDesktopCardSurfacePropsEqual = (
  prev: DesktopCardSurfaceProps,
  next: DesktopCardSurfaceProps,
) => {
  if (prev.card !== next.card) return false;
  if (prev.isActive !== next.isActive) return false;
  if (prev.isGlobalEditing !== next.isGlobalEditing) return false;
  if (prev.editPaneWidthPx !== next.editPaneWidthPx) return false;
  if (prev.settings !== next.settings) return false;
  if (prev.currentDisplayMode !== next.currentDisplayMode) return false;
  if (prev.viewZoomScale !== next.viewZoomScale) return false;
  if (prev.folderId !== next.folderId) return false;
  if (prev.cardSetId !== next.cardSetId) return false;
  if (prev.onFlip !== next.onFlip) return false;
  if (prev.onToggleUncertainty !== next.onToggleUncertainty) return false;
  if (prev.onToggleBookmark !== next.onToggleBookmark) return false;
  if (prev.onSyncStatusChange !== next.onSyncStatusChange) return false;

  if (next.isGlobalEditing && prev.cardsOverride !== next.cardsOverride) {
    return false;
  }

  const prevNeedsFlip = !prev.isGlobalEditing && prev.isActive;
  const nextNeedsFlip = !next.isGlobalEditing && next.isActive;

  if (prevNeedsFlip !== nextNeedsFlip) return false;
  if (nextNeedsFlip && prev.isFlipped !== next.isFlipped) return false;

  return true;
};

export const DesktopCardSurface = React.memo(
  DesktopCardSurfaceInner,
  areDesktopCardSurfacePropsEqual,
);

DesktopCardSurface.displayName = "DesktopCardSurface";
