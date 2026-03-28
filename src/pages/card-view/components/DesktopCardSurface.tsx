import React from "react";
import { Flashcard } from "@/components/card/frame/Flashcard";
import { CardEditorPane } from "@/components/folder/panes/CardEditorPane";
import type { Card, UserSettings } from "@/types";
import { CARD_PANE_AUTO_MAX_SCALE, EDIT_PREVIEW_RANGE } from "../constants";

export interface DesktopCardSurfaceProps {
  card: Card;
  isActive: boolean;
  isGlobalEditing: boolean;
  showEditPreview: boolean;
  editPaneWidthPx: number;
  settings?: Partial<UserSettings> | null;
  isFlipped: boolean;
  folderId: string | null;
  cardSetId: string | null;
  cardsOverride: Card[];
  saveSignal: number;
  onFlip: () => void;
  onEdit: () => void;
  onToggleUncertainty: (card: Card) => void | Promise<void>;
  onToggleBookmark: (card: Card) => void | Promise<void>;
}

export const DesktopCardSurface = React.memo(function DesktopCardSurface({
  card,
  isActive,
  isGlobalEditing,
  showEditPreview,
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
  if (isGlobalEditing) {
    if (!isActive && !showEditPreview) {
      return (
        <div
          className="w-full overflow-visible"
          style={{
            contentVisibility: "auto",
            containIntrinsicSize: "900px 1200px",
          }}
        >
          <div className="h-[900px] w-full" />
        </div>
      );
    }

    return (
      <div
        className="w-full overflow-visible"
        style={!isActive ? { pointerEvents: "none", userSelect: "none" } : undefined}
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
          hideBlockToolbars={!isActive}
          saveSignal={saveSignal}
          saveSignalEnabled={isActive}
          hideFooterActions
          embeddedInPager
          settingsOverride={settings}
          pairGapClassName="gap-4"
          highlightActiveCards={isActive}
        />
      </div>
    );
  }

  return (
    <div className="w-full overflow-visible">
      <Flashcard
        card={card}
        isFlipped={isFlipped}
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
});

// Re-export so CardViewDesktop can compute showEditPreview
export { EDIT_PREVIEW_RANGE };
