import React from "react";
import { SharedCardContent } from "@/components/card/common/SharedCardContent";
import {
  CANONICAL_CARD_WIDTH,
  layoutRowsToCardHeightPx,
} from "@/components/card/common/constants";
import { CardFrame } from "@/components/card/frame/CardFrame";
import { Flashcard } from "@/components/card/frame/Flashcard";
import { CardEditorPane } from "@/components/folder/panes/CardEditorPane";
import { normalizeLayoutRows } from "@/domain/card/extraRows";
import type { Card } from "@/types";
import { CARD_PANE_AUTO_MAX_SCALE, EDIT_PREVIEW_RANGE } from "../constants";

export interface DesktopCardSurfaceProps {
  card: Card;
  isActive: boolean;
  isGlobalEditing: boolean;
  showEditPreview: boolean;
  editPaneWidthPx: number;
  isFlipped: boolean;
  folderId: string | null;
  cardSetId: string | null;
  cardsOverride: Card[];
  saveSignal: number;
  globalToolbarMountQ: HTMLDivElement | null;
  globalToolbarMountA: HTMLDivElement | null;
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
  isFlipped,
  folderId,
  cardSetId,
  cardsOverride,
  saveSignal,
  globalToolbarMountQ,
  globalToolbarMountA,
  onFlip,
  onEdit,
  onToggleUncertainty,
  onToggleBookmark,
}: DesktopCardSurfaceProps) {
  if (isGlobalEditing) {
    if (!isActive) {
      if (showEditPreview) {
        const previewHeightPx = layoutRowsToCardHeightPx(
          normalizeLayoutRows(card.layoutRows),
        );
        return (
          <div className="w-full overflow-visible">
            <div
              className="mx-auto w-full pointer-events-none select-none"
              style={{ width: `${editPaneWidthPx}px`, maxWidth: "100%" }}
            >
              <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
                <CardFrame
                  baseWidth={CANONICAL_CARD_WIDTH}
                  contentPaddingPx={0}
                  allowUpscale
                  maxScale={CARD_PANE_AUTO_MAX_SCALE}
                  scaleMultiplier={1}
                  className="premium-paper-depth card-shell--paper"
                  resizable={false}
                  showResizeHandle={false}
                  heightPx={previewHeightPx}
                  lockHeight
                >
                  <SharedCardContent
                    mode="view"
                    blocks={card.questionBlocks ?? []}
                  />
                </CardFrame>
                <CardFrame
                  baseWidth={CANONICAL_CARD_WIDTH}
                  contentPaddingPx={0}
                  allowUpscale
                  maxScale={CARD_PANE_AUTO_MAX_SCALE}
                  scaleMultiplier={1}
                  className="premium-paper-depth card-shell--paper"
                  resizable={false}
                  showResizeHandle={false}
                  heightPx={previewHeightPx}
                  lockHeight
                >
                  <SharedCardContent
                    mode="view"
                    blocks={card.answerBlocks ?? []}
                  />
                </CardFrame>
              </div>
            </div>
          </div>
        );
      }

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
      <div className="w-full overflow-visible">
        <CardEditorPane
          selectedCardId={card.id}
          folderId={folderId || undefined}
          cardSetId={cardSetId || undefined}
          forcedPaneWidthPx={editPaneWidthPx}
          cardsOverride={cardsOverride}
          autoEdit
          hideMetaPanel
          dockToolbarsToTop
          hideBlockToolbars={false}
          saveSignal={saveSignal}
          hideFooterActions
          embeddedInPager
          externalToolbarMountQ={globalToolbarMountQ}
          externalToolbarMountA={globalToolbarMountA}
          pairGapClassName="gap-4"
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
