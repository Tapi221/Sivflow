import { adaptCard } from "@/adapters/cardAdapter";
import { Flashcard } from "@/components/card/frame/Flashcard";
import { CardEditorPane } from "@/components/folder/panes/CardEditorPane";
import { CARD_PANE_AUTO_MAX_SCALE } from "@/pages/card-view/constants";
import type { Card, UserSettings } from "@/types";
import React from "react";

export interface DesktopCardSurfaceProps {
  card: Card;
  isActive: boolean;
  isGlobalEditing: boolean;
  editPaneWidthPx: number;
  settings?: Partial<UserSettings> | null;
  isFlipped: boolean;
  folderId: string | null;
  cardSetId: string | null;
  cardsOverride?: Card[];
  saveSignal: number;
  onFlip: () => void;
  onEdit: () => void;
  onToggleUncertainty: (card: Card) => void | Promise<void>;
  onToggleBookmark: (card: Card) => void | Promise<void>;
}

function DesktopCardSurfaceInner({
  card,
  isActive,
  isGlobalEditing,
  editPaneWidthPx,
  settings = null,
  isFlipped,
  folderId,
  cardSetId,
  cardsOverride,
  saveSignal,
  onFlip,
  onEdit,
  onToggleUncertainty,
  onToggleBookmark,
}: DesktopCardSurfaceProps) {
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

  if (isGlobalEditing) {
    const canInteractWithEditor = isActive || hasFocusWithin;

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
          saveSignal={saveSignal}
          saveSignalEnabled={isActive}
          hideFooterActions
          embeddedInPager
          isPagerActiveCard={isActive}
          isPagerInteractionCard={canInteractWithEditor}
          settingsOverride={settings}
          pairGapClassName="gap-4"
          showResizeHandle={canInteractWithEditor}
        />
      </div>
    );
  }

  return (
    <div className="w-full overflow-visible">
      <Flashcard
        card={adaptCard(card)}
        isFlipped={isFlipped}
        previewMode={!isActive}
        onFlip={isActive ? onFlip : undefined}
        onEdit={isActive ? onEdit : undefined}
        onToggleUncertainty={isActive ? onToggleUncertainty : undefined}
        onToggleBookmark={isActive ? onToggleBookmark : undefined}
        allowUpscale
        maxScale={CARD_PANE_AUTO_MAX_SCALE}
        scaleMultiplier={1}
      />
    </div>
  );
}

const areDesktopCardSurfacePropsEqual = (
  prev: DesktopCardSurfaceProps,
  next: DesktopCardSurfaceProps,
) => {
  if (prev.card !== next.card) return false;
  if (prev.isActive !== next.isActive) return false;
  if (prev.isGlobalEditing !== next.isGlobalEditing) return false;
  if (prev.editPaneWidthPx !== next.editPaneWidthPx) return false;
  if (prev.settings !== next.settings) return false;
  if (prev.folderId !== next.folderId) return false;
  if (prev.cardSetId !== next.cardSetId) return false;
  if (prev.onFlip !== next.onFlip) return false;
  if (prev.onEdit !== next.onEdit) return false;
  if (prev.onToggleUncertainty !== next.onToggleUncertainty) return false;
  if (prev.onToggleBookmark !== next.onToggleBookmark) return false;

  if (next.isGlobalEditing) {
    if (prev.cardsOverride !== next.cardsOverride) return false;
    if (next.isActive && prev.saveSignal !== next.saveSignal) return false;
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