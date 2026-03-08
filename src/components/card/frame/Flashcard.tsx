import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Image as ImageIcon, Volume2 } from "@/ui/icons";
import { Link } from "@/ui/icons";
import { cn } from "@/lib/utils";
import {
  InkLayer,
  InkToolbar,
} from "@/components/ink/InkLayer";
import { resolveInkDocument } from "@/components/ink/inkStorage";
import { CardFrame } from "./CardFrame";
import { CardCornerActions } from "./CardCornerActions";
import { SharedCardContent } from "../common/SharedCardContent";
import {
  CANONICAL_CARD_WIDTH,
  CARD_ACTION_BG_CLASS,
  CARD_ACTION_COLOR_IDLE_CLASS,
  CARD_ACTION_ICON_CLASS,
  layoutRowsToCardHeightPx,
} from "../common/constants";
import {
  type FlashcardCardLike,
  resolveCardId,
  resolveHasUncertainty,
  resolveIsBookmarked,
  resolveQuestionText,
  resolveAnswerText,
  resolveQuestionImages,
  resolveAnswerImages,
  resolveQuestionAudios,
  resolveAnswerAudios,
  resolveQuestionCode,
  resolveAnswerCode,
  resolveLayoutRows,
  resolveImageUrls,
  resolveAudioUrls,
  resolveReferences,
} from "./flashcardDerived";
import { resolveSideBlocks } from "./flashcardBlocks";
import { useFlashcardInk } from "./useFlashcardInk";
import { FlashcardMediaDialogs } from "./FlashcardMediaDialogs";
import { FlashcardNavigation } from "./FlashcardNavigation";
import type { InkDocument } from "@/components/ink/inkTypes";

// Re-export for consumers who import the type from this file
export type { FlashcardCardLike };

interface FlashcardProps {
  card: FlashcardCardLike | null | undefined;
  isFlipped?: boolean;
  onFlip?: () => void;
  onEdit?: (card: FlashcardCardLike) => void;
  onToggleUncertainty?: (card: FlashcardCardLike) => void;
  onToggleBookmark?: (card: FlashcardCardLike) => void;
  className?: string;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  currentIndex?: number;
  totalCards?: number;
  previewMode?: boolean;
  extraHeaderLeft?: React.ReactNode;
  extraHeaderRight?: React.ReactNode;
  extraFooter?: React.ReactNode;
  drawMode?: boolean;
  inkEditingEnabled?: boolean;
  onInkDocumentChange?: (
    side: "question" | "answer",
    nextDocument: InkDocument,
  ) => void;
  allowUpscale?: boolean;
  maxScale?: number;
  scaleMultiplier?: number;
  contentPaddingPx?: number;
}

export function Flashcard({
  card,
  isFlipped,
  onFlip,
  onEdit,
  onToggleUncertainty,
  onToggleBookmark,
  className,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  currentIndex,
  totalCards,
  previewMode,
  extraHeaderLeft,
  extraHeaderRight,
  extraFooter,
  drawMode,
  inkEditingEnabled = false,
  onInkDocumentChange,
  allowUpscale = false,
  maxScale = 1.6,
  scaleMultiplier = 1,
  contentPaddingPx,
}: FlashcardProps) {
  const cardData = card;
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [previewFlipped, setPreviewFlipped] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isReferencePopupOpen, setIsReferencePopupOpen] = useState(false);
  const [isImagePopupOpen, setIsImagePopupOpen] = useState(false);
  const [isAudioPopupOpen, setIsAudioPopupOpen] = useState(false);

  // ---- 先に派生値を確定（TDZ回避） ----
  const cardIdForInk = cardData ? resolveCardId(cardData) : null;
  const enableDrawMode = drawMode ?? false;
  const effectiveIsFlipped =
    isFlipped ?? (previewMode ? previewFlipped : false);
  const activeInkSide: "question" | "answer" = effectiveIsFlipped
    ? "answer"
    : "question";

  // previewMode 切り替え時に flip をリセット
  useEffect(() => {
    if (!previewMode) return;
    queueMicrotask(() => setPreviewFlipped(false));
  }, [previewMode, cardData?.id]);

  // ---------------------------------------------------------------------------
  // Ink hook
  // ---------------------------------------------------------------------------
  const {
    previewInkRef,
    previewInkTool,
    setPreviewInkTool,
    previewInkHistory,
    setPreviewInkHistory,
    layoutStable,
    shouldMountInkLayer,
    handleInkDocumentChange,
  } = useFlashcardInk({
    cardId: cardIdForInk,
    effectiveIsFlipped,
    inkEditingEnabled,
    previewMode: previewMode ?? false,
    contentRef,
    onInkDocumentChange,
  });

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------
  const hasUncertainty = cardData ? resolveHasUncertainty(cardData) : false;
  const isBookmarked = cardData ? resolveIsBookmarked(cardData) : false;

  const questionText = cardData ? resolveQuestionText(cardData) : "";
  const answerText = cardData ? resolveAnswerText(cardData) : "";

  const questionCode = cardData ? resolveQuestionCode(cardData) : null;
  const answerCode = cardData ? resolveAnswerCode(cardData) : null;

  const questionImageUrls = React.useMemo(
    () => resolveImageUrls(cardData ? resolveQuestionImages(cardData) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardData?.question_images, cardData?.questionImages],
  );
  const answerImageUrls = React.useMemo(
    () => resolveImageUrls(cardData ? resolveAnswerImages(cardData) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardData?.answer_images, cardData?.answerImages],
  );
  const questionAudios = React.useMemo(
    () => (cardData ? resolveQuestionAudios(cardData) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardData?.question_audios, cardData?.questionAudios],
  );
  const answerAudios = React.useMemo(
    () => (cardData ? resolveAnswerAudios(cardData) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardData?.answer_audios, cardData?.answerAudios],
  );
  const questionAudioUrls = React.useMemo(
    () => resolveAudioUrls(questionAudios),
    [questionAudios],
  );
  const answerAudioUrls = React.useMemo(
    () => resolveAudioUrls(answerAudios),
    [answerAudios],
  );

  const questionReferences = React.useMemo(
    () => resolveReferences(cardData?.questionBlocks ?? []),
    [cardData?.questionBlocks],
  );
  const answerReferences = React.useMemo(
    () => resolveReferences(cardData?.answerBlocks ?? []),
    [cardData?.answerBlocks],
  );

  const layoutRows = cardData ? resolveLayoutRows(cardData) : 0;

  const questionInkDocument = React.useMemo(
    () =>
      resolveInkDocument(cardIdForInk, "question", cardData?.inkQuestion ?? null),
    [cardData?.inkQuestion, cardIdForInk],
  );
  const answerInkDocument = React.useMemo(
    () =>
      resolveInkDocument(cardIdForInk, "answer", cardData?.inkAnswer ?? null),
    [cardData?.inkAnswer, cardIdForInk],
  );

  // ---------------------------------------------------------------------------
  // Active-side derived values
  // ---------------------------------------------------------------------------
  const activeSide: "question" | "answer" = effectiveIsFlipped
    ? "answer"
    : "question";
  const activeImages = effectiveIsFlipped ? answerImageUrls : questionImageUrls;
  const activeAudioUrls = effectiveIsFlipped
    ? answerAudioUrls
    : questionAudioUrls;
  const activeReferences = effectiveIsFlipped
    ? answerReferences
    : questionReferences;
  const activeInkDocument = effectiveIsFlipped
    ? answerInkDocument
    : questionInkDocument;

  const activeBlocks = React.useMemo(
    () =>
      resolveSideBlocks(activeSide, {
        blocks:
          activeSide === "question"
            ? (cardData?.questionBlocks ?? [])
            : (cardData?.answerBlocks ?? []),
        text: activeSide === "question" ? questionText : answerText,
        imageUrls: activeSide === "question" ? questionImageUrls : answerImageUrls,
        audios: activeSide === "question" ? questionAudios : answerAudios,
        code: activeSide === "question" ? questionCode : answerCode,
      }),
    [
      activeSide,
      cardData?.questionBlocks,
      cardData?.answerBlocks,
      questionText,
      answerText,
      questionImageUrls,
      answerImageUrls,
      questionAudios,
      answerAudios,
      questionCode,
      answerCode,
    ],
  );

  // ---------------------------------------------------------------------------
  // Flip handling
  // ---------------------------------------------------------------------------

  // Flip阻害条件を集約（増えてもここだけ直せば良い）
  const isModalBlockingFlip =
    isImageModalOpen ||
    isImagePopupOpen ||
    isAudioPopupOpen ||
    isReferencePopupOpen;

  const isInkEditingActive = Boolean(
    previewMode && inkEditingEnabled && previewInkTool,
  );

  const handleFlip = React.useCallback(
    (e?: React.MouseEvent) => {
      if (isModalBlockingFlip) return;
      if (isInkEditingActive) return;

      if (previewMode) {
        e?.stopPropagation();
        setPreviewFlipped((prev) => !prev);
        return;
      }

      if (onFlip) {
        e?.stopPropagation();
        onFlip();
      }
    },
    [isModalBlockingFlip, isInkEditingActive, previewMode, onFlip],
  );

  const handleGalleryFullscreenChange = React.useCallback(
    (isFullscreen: boolean) => {
      setIsImageModalOpen(isFullscreen);
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Corner actions assembly
  // ---------------------------------------------------------------------------
  const actionsTopLeft: React.ReactNode[] = [];
  const actionsTopRight: React.ReactNode[] = [];
  const mediaActionNodes: React.ReactNode[] = [];

  // extraHeaderLeft は名前通り TopLeft 側へ
  if (extraHeaderLeft) {
    actionsTopLeft.push(
      <div
        key="extra-header-left"
        className="flex"
        onClick={(e) => e.stopPropagation()}
      >
        {extraHeaderLeft}
      </div>,
    );
  }

  if (activeImages.length > 0) {
    mediaActionNodes.push(
      <button
        key="images"
        onClick={(e) => {
          e.stopPropagation();
          setIsImagePopupOpen(true);
        }}
        className="flex items-center gap-1 px-2 py-1 h-8 min-h-0 min-w-0 rounded-full bg-indigo-500 text-white shadow-[0_2px_0_#4338ca] active:shadow-none active:translate-y-[2px] transition-all hover:bg-indigo-400 hover:shadow-[0_2px_0_#4338ca]"
      >
        <ImageIcon className={CARD_ACTION_ICON_CLASS} />
        <span className="text-[10px] font-bold">x{activeImages.length}</span>
      </button>,
    );
  }

  if (activeAudioUrls.length > 0) {
    mediaActionNodes.push(
      <button
        key="audios"
        onClick={(e) => {
          e.stopPropagation();
          setIsAudioPopupOpen(true);
        }}
        className="flex items-center gap-1 px-2 py-1 h-8 min-h-0 min-w-0 rounded-full transition-all bg-amber-500 text-white shadow-[0_2px_0_#b45309] active:shadow-none active:translate-y-[2px] hover:bg-amber-400 hover:shadow-[0_2px_0_#b45309]"
      >
        <Volume2 className={CARD_ACTION_ICON_CLASS} />
        <span className="text-[10px] font-bold">x{activeAudioUrls.length}</span>
      </button>,
    );
  }

  if (activeReferences.length > 0) {
    mediaActionNodes.push(
      <button
        key="references"
        onClick={(e) => {
          e.stopPropagation();
          setIsReferencePopupOpen(true);
        }}
        className="flex items-center gap-1 px-2 py-1 h-8 min-h-0 min-w-0 rounded-full transition-all bg-cyan-500 text-white shadow-[0_2px_0_#0e7490] active:shadow-none active:translate-y-[2px] hover:bg-cyan-400"
      >
        <Link className={CARD_ACTION_ICON_CLASS} />
        <span className="text-[10px] font-bold">
          x{activeReferences.length}
        </span>
      </button>,
    );
  }

  if (mediaActionNodes.length > 0) {
    actionsTopRight.push(
      <div
        key="media-actions"
        className="flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {mediaActionNodes}
      </div>,
    );
  }

  // アクション表示（編集(onEdit)以外はプレビューでも表示）
  if (onToggleUncertainty || onToggleBookmark) {
    actionsTopLeft.push(
      <CardCornerActions
        key="corner-actions"
        onHelp={
          onToggleUncertainty ? () => onToggleUncertainty(cardData!) : undefined
        }
        onStar={onToggleBookmark ? () => onToggleBookmark(cardData!) : undefined}
        helpActive={hasUncertainty}
        starActive={isBookmarked}
      />,
    );
  }

  if (onEdit && !previewMode) {
    actionsTopRight.push(
      <Button
        key="edit"
        variant="ghost"
        size="icon"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onEdit(cardData!);
        }}
        className={cn(
          "rounded-none w-8 h-8 md:w-9 md:h-9 transition-colors",
          CARD_ACTION_BG_CLASS,
          CARD_ACTION_COLOR_IDLE_CLASS,
        )}
      >
        <Edit className={CARD_ACTION_ICON_CLASS} />
      </Button>,
    );
  }

  // ---------------------------------------------------------------------------
  // Overlay node（ink / header / footer）
  // ---------------------------------------------------------------------------

  // overlay を安定化（Inkが余計に再マウント/再描画されにくい）
  const overlayNode = React.useMemo(() => {
    const hasHeaderOverlay = Boolean(extraHeaderRight && !previewMode);
    const hasFooterOverlay = Boolean(extraFooter);
    const hasInkOverlay = Boolean(
      previewMode && inkEditingEnabled && cardIdForInk,
    );
    if (!hasHeaderOverlay && !hasFooterOverlay && !hasInkOverlay) return null;

    return (
      <>
        {hasHeaderOverlay && (
          <div className="absolute right-2 top-2 z-30 pointer-events-none">
            <div
              className="pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {extraHeaderRight}
            </div>
          </div>
        )}
        {hasFooterOverlay && (
          <div className="absolute inset-x-0 bottom-2 z-30 pointer-events-none">
            <div
              className="flex justify-center pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {extraFooter}
            </div>
          </div>
        )}
        {hasInkOverlay && (
          <>
            {shouldMountInkLayer && (
              <InkLayer
                ref={previewInkRef}
                cardId={cardIdForInk}
                side={activeInkSide}
                editable={Boolean(
                  previewMode && inkEditingEnabled && layoutStable,
                )}
                tool={previewInkTool ?? "pen"}
                value={activeInkDocument}
                onChange={(next) =>
                  handleInkDocumentChange(activeInkSide, next)
                }
                onHistoryChange={setPreviewInkHistory}
              />
            )}

            {previewMode && inkEditingEnabled && !layoutStable && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/25 text-slate-600 text-xs font-semibold">
                レイアウト準備中...
              </div>
            )}

            {/* ✅ stable 前は ref が null なので出さない */}
            {previewMode && inkEditingEnabled && layoutStable && (
              <div className="absolute bottom-2 left-2 z-30 pointer-events-auto">
                <InkToolbar
                  tool={previewInkTool}
                  canUndo={previewInkHistory.canUndo}
                  canRedo={previewInkHistory.canRedo}
                  onToolChange={setPreviewInkTool}
                  onUndo={() => previewInkRef.current?.undo()}
                  onRedo={() => previewInkRef.current?.redo()}
                  onClear={() => previewInkRef.current?.clear()}
                />
              </div>
            )}
          </>
        )}
      </>
    );
  }, [
    cardIdForInk,
    handleInkDocumentChange,
    activeInkSide,
    activeInkDocument,
    inkEditingEnabled,
    layoutStable,
    previewInkTool,
    previewInkHistory.canUndo,
    previewInkHistory.canRedo,
    extraFooter,
    extraHeaderRight,
    previewMode,
    shouldMountInkLayer,
    previewInkRef,
    setPreviewInkHistory,
    setPreviewInkTool,
  ]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const fixedHeightPx = layoutRowsToCardHeightPx(layoutRows);

  if (!cardData) {
    return <div className="text-center py-12 text-gray-500">No Card Data</div>;
  }

  return (
    <div
      className={cn(
        "w-full flex flex-col select-none overflow-visible",
        className,
      )}
    >
      <div className="relative">
        <CardFrame
          baseWidth={CANONICAL_CARD_WIDTH}
          contentPaddingPx={contentPaddingPx ?? 0}
          allowUpscale={allowUpscale}
          maxScale={maxScale}
          scaleMultiplier={scaleMultiplier}
          className={cn(
            "premium-paper-depth",
            !previewMode && "cursor-pointer",
            "card-shell--paper",
          )}
          onClick={handleFlip}
          resizable={false}
          resizeStepPx={undefined}
          showResizeHandle={false}
          heightPx={fixedHeightPx}
          lockHeight
          actionsTopLeft={
            actionsTopLeft.length > 0 ? actionsTopLeft : undefined
          }
          actionsTopRight={
            actionsTopRight.length > 0 ? actionsTopRight : undefined
          }
          drawMode={enableDrawMode}
          ruledPhasePx={0}
          overlay={overlayNode}
        >
          <div
            ref={contentRef}
            className="animate-in fade-in zoom-in-95 duration-300 w-full max-w-full flex min-h-0 flex-1"
          >
            <SharedCardContent
              mode="view"
              blocks={activeBlocks}
              onGalleryFullscreenChange={handleGalleryFullscreenChange}
            />
          </div>
        </CardFrame>
      </div>

      <FlashcardMediaDialogs
        isImagePopupOpen={isImagePopupOpen}
        setIsImagePopupOpen={setIsImagePopupOpen}
        isAudioPopupOpen={isAudioPopupOpen}
        setIsAudioPopupOpen={setIsAudioPopupOpen}
        isReferencePopupOpen={isReferencePopupOpen}
        setIsReferencePopupOpen={setIsReferencePopupOpen}
        activeImages={activeImages}
        activeAudioUrls={activeAudioUrls}
        activeReferences={activeReferences}
      />

      {/* ナビゲーション（オプション）- プレビュー時は非表示 */}
      {!previewMode && (
        <FlashcardNavigation
          onNext={onNext}
          onPrev={onPrev}
          hasNext={hasNext}
          hasPrev={hasPrev}
          currentIndex={currentIndex}
          totalCards={totalCards}
        />
      )}
    </div>
  );
}
