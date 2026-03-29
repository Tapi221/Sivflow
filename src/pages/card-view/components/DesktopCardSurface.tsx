import React from "react";
import { SharedCardContent } from "@/components/card/common/SharedCardContent";
import {
  CANONICAL_CARD_WIDTH,
  layoutRowsToCardHeightPx,
} from "@/components/card/common/constants";
import { CardFrame } from "@/components/card/frame/CardFrame";
import { Flashcard } from "@/components/card/frame/Flashcard";
import {
  type FlashcardCardLike,
  resolveAnswerAudios,
  resolveAnswerCode,
  resolveAnswerText,
  resolveLayoutRows,
  resolveQuestionAudios,
  resolveQuestionCode,
  resolveQuestionText,
} from "@/components/card/frame/flashcardDerived";
import { resolveSideBlocks } from "@/components/card/frame/flashcardBlocks";
import { CARD_SHELL_COMMON_CLASS_NAME } from "@/components/card/frame/cardShellClassNames";
import { CardEditorPane } from "@/components/folder/panes/CardEditorPane";
import type { Card, CardBlock, UserSettings } from "@/types";
import { CARD_PANE_AUTO_MAX_SCALE } from "@/pages/card-view/constants";

const EDITOR_PREVIEW_PAIR_GAP_PX = 16;
const EMPTY_BLOCKS: CardBlock[] = [];

function resolvePreviewSideBlocks(
  cardLike: FlashcardCardLike,
  side: "question" | "answer",
): CardBlock[] {
  const sourceBlocks =
    side === "question"
      ? (cardLike.questionBlocks ?? EMPTY_BLOCKS)
      : (cardLike.answerBlocks ?? EMPTY_BLOCKS);
  return resolveSideBlocks(side, {
    blocks: sourceBlocks,
    text: side === "question"
      ? resolveQuestionText(cardLike)
      : resolveAnswerText(cardLike),
    audios: side === "question"
      ? resolveQuestionAudios(cardLike)
      : resolveAnswerAudios(cardLike),
    code: side === "question"
      ? resolveQuestionCode(cardLike)
      : resolveAnswerCode(cardLike),
  });
}

type InactiveEditorPairPreviewProps = {
  card: Card;
  paneWidthPx: number;
};

function InactiveEditorPairPreviewInner({
  card,
  paneWidthPx,
}: InactiveEditorPairPreviewProps) {
  const cardLike = card as unknown as FlashcardCardLike;
  const questionBlocks = React.useMemo(
    () => resolvePreviewSideBlocks(cardLike, "question"),
    [cardLike],
  );
  const answerBlocks = React.useMemo(
    () => resolvePreviewSideBlocks(cardLike, "answer"),
    [cardLike],
  );

  const heightPx = layoutRowsToCardHeightPx(resolveLayoutRows(cardLike));
  const targetWidth = Math.max(1, (paneWidthPx - EDITOR_PREVIEW_PAIR_GAP_PX) / 2);
  const fixedScale = Math.max(
    0.1,
    Math.min(
      CARD_PANE_AUTO_MAX_SCALE,
      targetWidth / Math.max(1, CANONICAL_CARD_WIDTH),
    ),
  );

  return (
    <div className="w-full overflow-visible pointer-events-none select-none">
      <div
        className="grid w-full max-w-full grid-cols-2"
        style={{ columnGap: `${EDITOR_PREVIEW_PAIR_GAP_PX}px` }}
      >
        <CardFrame
          baseWidth={CANONICAL_CARD_WIDTH}
          contentPaddingPx={0}
          allowUpscale
          maxScale={CARD_PANE_AUTO_MAX_SCALE}
          scaleMultiplier={1}
          fixedScale={fixedScale}
          className={CARD_SHELL_COMMON_CLASS_NAME}
          resizable={false}
          showResizeHandle={false}
          heightPx={heightPx}
          lockHeight
        >
          <div className="w-full max-w-full flex min-h-0 flex-1">
            <SharedCardContent mode="view" blocks={questionBlocks} />
          </div>
        </CardFrame>

        <CardFrame
          baseWidth={CANONICAL_CARD_WIDTH}
          contentPaddingPx={0}
          allowUpscale
          maxScale={CARD_PANE_AUTO_MAX_SCALE}
          scaleMultiplier={1}
          fixedScale={fixedScale}
          className={CARD_SHELL_COMMON_CLASS_NAME}
          resizable={false}
          showResizeHandle={false}
          heightPx={heightPx}
          lockHeight
        >
          <div className="w-full max-w-full flex min-h-0 flex-1">
            <SharedCardContent mode="view" blocks={answerBlocks} />
          </div>
        </CardFrame>
      </div>
    </div>
  );
}

const InactiveEditorPairPreview = React.memo(
  InactiveEditorPairPreviewInner,
  (prev, next) =>
    prev.card === next.card && prev.paneWidthPx === next.paneWidthPx,
);
InactiveEditorPairPreview.displayName = "InactiveEditorPairPreview";

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
  mountEditor?: boolean;
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
  mountEditor = false,
  saveSignal,
  onFlip,
  onEdit,
  onToggleUncertainty,
  onToggleBookmark,
}: DesktopCardSurfaceProps) {
  if (isGlobalEditing) {
    const shouldMountEditor = isActive || mountEditor;
    if (!shouldMountEditor) {
      return <InactiveEditorPairPreview card={card} paneWidthPx={editPaneWidthPx} />;
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
          isPagerActiveCard={isActive}
          settingsOverride={settings}
          pairGapClassName="gap-4"
          showResizeHandle={isActive}
        />
      </div>
    );
  }

  return (
    <div className="w-full overflow-visible">
      <Flashcard
        card={card}
        isFlipped={isActive ? isFlipped : false}
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
  if (prev.mountEditor !== next.mountEditor) return false;

  const prevNeedsEditor = prev.isGlobalEditing && (prev.isActive || prev.mountEditor);
  const nextNeedsEditor = next.isGlobalEditing && (next.isActive || next.mountEditor);
  if (prevNeedsEditor !== nextNeedsEditor) return false;
  if (nextNeedsEditor) {
    if (prev.cardsOverride !== next.cardsOverride) return false;
    if (prev.saveSignal !== next.saveSignal) return false;
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
