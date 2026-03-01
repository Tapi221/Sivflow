import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/Components/ui/button';
import { ChevronLeft, ChevronRight, Pencil, Image as ImageIcon, X, Volume2 } from 'lucide-react';
import LinkIcon from 'lucide-react/dist/esm/icons/link';

import { Dialog, DialogContent } from '@/Components/ui/dialog';
import { cn } from '@/lib/utils';
import { AudioPlayer } from './CardMedia';
import { ReferencePopup } from './ReferencePopup';
import type { CardBlock, ReferenceBlockData } from '@/types';
import { InkLayer, InkToolbar, type InkHistoryState, type InkLayerHandle } from '@/Components/ink/InkLayer';
import { resolveInkDocument } from '@/Components/ink/inkStorage';
import { INK_DOCUMENT_VERSION, type InkDocument, type InkEditTool } from '@/Components/ink/inkTypes';
import { CardFrame } from './frame/CardFrame';
import { CardCornerActions } from './frame/CardCornerActions';
import { SharedCardContent } from './SharedCardContent';
import { CANONICAL_CARD_WIDTH, layoutRowsToCardHeightPx } from './constants';
import { sortBlocksByOrderIndex } from './blockOrdering';
import {
  DEFAULT_LAYOUT_ROWS,
  LEGACY_BASE_LAYOUT_ROWS,
  normalizeExtraRows,
  normalizeLayoutRows,
} from '@/domain/card/extraRows';
import { useCards } from '@/hooks/useCards';

type FlashcardMediaLike =
  | string
  | {
      remoteUrl?: string | null;
      localUrl?: string | null;
      url?: string | null;
    };

type FlashcardCardLike = {
  id?: string;
  cardId?: string;
  has_uncertainty?: boolean;
  hasUncertainty?: boolean;
  is_bookmarked?: boolean;
  isBookmarked?: boolean;
  question_text?: string;
  questionText?: string;
  answer_text?: string;
  answerText?: string;
  question_images?: FlashcardMediaLike[];
  questionImages?: FlashcardMediaLike[];
  answer_images?: FlashcardMediaLike[];
  answerImages?: FlashcardMediaLike[];
  question_audios?: FlashcardMediaLike[];
  questionAudios?: FlashcardMediaLike[];
  answer_audios?: FlashcardMediaLike[];
  answerAudios?: FlashcardMediaLike[];
  questionCode?: { code?: string; language?: string } | null;
  question_code?: { code?: string; language?: string } | null;
  answerCode?: { code?: string; language?: string } | null;
  answer_code?: { code?: string; language?: string } | null;
  questionBlocks?: CardBlock[];
  answerBlocks?: CardBlock[];
  layoutRows?: number;
  layout_rows?: number;
  /** @deprecated Read-only legacy field. Use layoutRows/layout_rows. */
  questionExtraRows?: number;
  /** @deprecated Read-only legacy field. Use layoutRows/layout_rows. */
  question_extra_rows?: number;
  /** @deprecated Read-only legacy field. Use layoutRows/layout_rows. */
  answerExtraRows?: number;
  /** @deprecated Read-only legacy field. Use layoutRows/layout_rows. */
  answer_extra_rows?: number;
  inkQuestion?: InkDocument | null;
  inkAnswer?: InkDocument | null;
  [key: string]: unknown;
};

interface FlashcardProps {
  card: FlashcardCardLike | null | undefined;
  isFlipped?: boolean;
  onFlip?: () => void;
  onEdit?: (card: FlashcardCardLike) => void;
  onToggleUncertainty?: (card: FlashcardCardLike) => void;
  onToggleBookmark?: (card: FlashcardCardLike) => void;
  className?: string;
  showNavigation?: boolean;
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
  onInkDocumentChange?: (side: 'question' | 'answer', nextDocument: InkDocument) => void;
}

export function Flashcard({
  card,
  isFlipped,
  onFlip,
  onEdit,
  onToggleUncertainty,
  onToggleBookmark,
  className,
  showNavigation,
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
}: FlashcardProps) {
  const cardData = card;
  const { updateCard } = useCards();

  const [previewFlipped, setPreviewFlipped] = useState(false);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isReferencePopupOpen, setIsReferencePopupOpen] = useState(false);
  const [isImagePopupOpen, setIsImagePopupOpen] = useState(false);
  const [isAudioPopupOpen, setIsAudioPopupOpen] = useState(false);

  const previewInkRef = useRef<InkLayerHandle | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [previewInkTool, setPreviewInkTool] = useState<InkEditTool | null>(null);
  const [previewInkHistory, setPreviewInkHistory] = useState<InkHistoryState>({
    canUndo: false,
    canRedo: false,
    strokeCount: 0,
  });
  const [layoutStable, setLayoutStable] = useState(false);

  // ✅ side も含めて保持（debounce中のflipでも保存先を間違えない）
  const pendingInkRef = useRef<{ side: 'question' | 'answer'; doc: InkDocument } | null>(null);
  const inkSaveTimerRef = useRef<number | null>(null);

  // ---- 先に派生値を確定（TDZ回避） ----
  const cardIdForInk = cardData?.id ?? cardData?.cardId ?? null;
  const enableDrawMode = drawMode ?? false;
  const effectiveIsFlipped = isFlipped ?? (previewMode ? previewFlipped : false);
  const activeInkSide: 'question' | 'answer' = effectiveIsFlipped ? 'answer' : 'question';

  useEffect(() => {
    if (!previewMode) return;
    setPreviewFlipped(false);
  }, [previewMode, cardData?.id]);

  useEffect(() => {
    if (!inkEditingEnabled) {
      setPreviewInkTool(null);
      return;
    }
    setPreviewInkTool((prev) => prev ?? 'pen');
  }, [inkEditingEnabled]);

  useEffect(() => {
    if (!previewMode || !inkEditingEnabled) {
      setLayoutStable(false);
      return;
    }

    let cancelled = false;
    let settleTimer: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const scheduleStable = () => {
      if (cancelled) return;
      if (settleTimer != null) {
        window.clearTimeout(settleTimer);
      }
      settleTimer = window.setTimeout(() => {
        if (!cancelled) {
          setLayoutStable(true);
        }
      }, 250);
    };

    const init = async () => {
      setLayoutStable(false);

      const fontsReady = (document as any).fonts?.ready;
      if (fontsReady && typeof fontsReady.then === 'function') {
        try {
          await fontsReady;
        } catch {
          // ignore
        }
      }
      if (cancelled) return;

      const root = contentRef.current;
      if (!root) {
        scheduleStable();
        return;
      }

      const images = Array.from(root.querySelectorAll('img'));
      const imageWaiters = images
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise<void>((resolve) => {
              const done = () => {
                img.removeEventListener('load', done);
                img.removeEventListener('error', done);
                resolve();
              };
              img.addEventListener('load', done, { once: true });
              img.addEventListener('error', done, { once: true });
            })
        );

      if (imageWaiters.length > 0) {
        await Promise.allSettled(imageWaiters);
      }
      if (cancelled) return;

      scheduleStable();

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          setLayoutStable(false);
          scheduleStable();
        });
        resizeObserver.observe(root);
      }
    };

    void init();
    return () => {
      cancelled = true;
      if (settleTimer != null) {
        window.clearTimeout(settleTimer);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [cardData?.id, effectiveIsFlipped, inkEditingEnabled, previewMode]);

  // 参考リンク抽出
  const questionReferences = React.useMemo(() => {
    const refs: ReferenceBlockData[] = [];
    const qBlocks: CardBlock[] = cardData?.questionBlocks ?? [];
    qBlocks.forEach((block) => {
      if (block.type === 'reference' && (block as any).references) refs.push(...((block as any).references as ReferenceBlockData[]));
    });
    return refs.filter((r) => r.url);
  }, [cardData?.questionBlocks]);

  const answerReferences = React.useMemo(() => {
    const refs: ReferenceBlockData[] = [];
    const aBlocks: CardBlock[] = cardData?.answerBlocks ?? [];
    aBlocks.forEach((block) => {
      if (block.type === 'reference' && (block as any).references) refs.push(...((block as any).references as ReferenceBlockData[]));
    });
    return refs.filter((r) => r.url);
  }, [cardData?.answerBlocks]);

  // 安全なプロパティアクセス（異なる命名規則への対応）
  const hasUncertainty = card?.has_uncertainty ?? card?.hasUncertainty ?? false;
  const isBookmarked = card?.is_bookmarked ?? card?.isBookmarked ?? false;

  const questionText = cardData?.question_text ?? cardData?.questionText ?? '';
  const questionImages = cardData?.question_images ?? cardData?.questionImages ?? [];
  const questionAudios = cardData?.question_audios ?? cardData?.questionAudios ?? [];

  const answerText = cardData?.answer_text ?? cardData?.answerText ?? '';
  const answerImages = cardData?.answer_images ?? cardData?.answerImages ?? [];
  const answerAudios = cardData?.answer_audios ?? cardData?.answerAudios ?? [];

  const questionCode = cardData?.questionCode || cardData?.question_code || null;
  const answerCode = cardData?.answerCode || cardData?.answer_code || null;

  const legacyQuestionExtraRows = normalizeExtraRows(cardData?.questionExtraRows ?? cardData?.question_extra_rows ?? 0);
  const legacyAnswerExtraRows = normalizeExtraRows(cardData?.answerExtraRows ?? cardData?.answer_extra_rows ?? 0);

  // ✅ B案（raw/safe分離 + finiteガード）
  const rawLayoutRows =
    cardData?.layoutRows ??
    cardData?.layout_rows ??
    (LEGACY_BASE_LAYOUT_ROWS + Math.max(legacyQuestionExtraRows, legacyAnswerExtraRows));

  const safeLayoutRows = Number.isFinite(rawLayoutRows) ? rawLayoutRows : DEFAULT_LAYOUT_ROWS;
  const layoutRows = normalizeLayoutRows(safeLayoutRows);

  const questionInkDocument = React.useMemo(
    () => resolveInkDocument(cardIdForInk, 'question', cardData?.inkQuestion ?? null),
    [cardData?.inkQuestion, cardIdForInk]
  );

  const answerInkDocument = React.useMemo(
    () => resolveInkDocument(cardIdForInk, 'answer', cardData?.inkAnswer ?? null),
    [cardData?.inkAnswer, cardIdForInk]
  );

  const questionImageUrls = (questionImages ?? [])
    .map((image: any) => image?.remoteUrl ?? image?.localUrl ?? image?.url ?? image)
    .filter(Boolean);

  const answerImageUrls = (answerImages ?? [])
    .map((image: any) => image?.remoteUrl ?? image?.localUrl ?? image?.url ?? image)
    .filter(Boolean);

  const handleGalleryFullscreenChange = React.useCallback((isFullscreen: boolean) => {
    setIsImageModalOpen(isFullscreen);
  }, []);

  if (!cardData) {
    return <div className="text-center py-12 text-gray-500">No Card Data</div>;
  }

  const activeReferences = effectiveIsFlipped ? answerReferences : questionReferences;
  const activeInkDocument = effectiveIsFlipped ? answerInkDocument : questionInkDocument;

  // Flip阻害条件を集約（増えてもここだけ直せば良い）
  const isModalBlockingFlip =
    isImageModalOpen || isImagePopupOpen || isAudioPopupOpen || isReferencePopupOpen;

  const isInkEditingActive = Boolean(previewMode && inkEditingEnabled && previewInkTool);

  // ✅ stable になってからマウント（書けない/ズレないを優先）
  const shouldMountInkLayer = Boolean(previewMode && inkEditingEnabled && cardIdForInk && layoutStable);

  const flushPendingInk = React.useCallback(() => {
    if (!cardIdForInk) return;

    const pending = pendingInkRef.current;
    if (!pending) return;

    pendingInkRef.current = null;

    updateCard(
      cardIdForInk,
      pending.side === 'question' ? { inkQuestion: pending.doc } : { inkAnswer: pending.doc }
    ).catch((error) => {
      console.error('[Flashcard] Failed to persist ink document', error);
    });
  }, [cardIdForInk, updateCard]);

  const handleInkDocumentChange = React.useCallback(
    (side: 'question' | 'answer', nextDocument: InkDocument) => {
      const next: InkDocument = {
        ...nextDocument,
        version: nextDocument.version ?? INK_DOCUMENT_VERSION,
        updatedAt: Date.now(),
      };

      onInkDocumentChange?.(side, next);

      // ✅ side も一緒に保持
      pendingInkRef.current = { side, doc: next };

      if (inkSaveTimerRef.current != null) {
        window.clearTimeout(inkSaveTimerRef.current);
      }
      inkSaveTimerRef.current = window.setTimeout(() => {
        flushPendingInk();
        inkSaveTimerRef.current = null;
      }, 300);
    },
    [flushPendingInk, onInkDocumentChange]
  );

  useEffect(() => {
    return () => {
      if (inkSaveTimerRef.current != null) {
        window.clearTimeout(inkSaveTimerRef.current);
      }
      flushPendingInk();
    };
  }, [flushPendingInk]);

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
    [isModalBlockingFlip, isInkEditingActive, previewMode, onFlip]
  );

  const actionsTopLeft: React.ReactNode[] = [];
  const actionsTopRight: React.ReactNode[] = [];
  const mediaActionNodes: React.ReactNode[] = [];

  // extraHeaderLeft は名前通り TopLeft 側へ
  if (extraHeaderLeft) {
    actionsTopLeft.push(
      <div key="extra-header-left" className="flex" onClick={(e) => e.stopPropagation()}>
        {extraHeaderLeft}
      </div>
    );
  }

  // 有効な画像（ブロックではなくポップアップ用）
  const activeImages = effectiveIsFlipped ? answerImageUrls : questionImageUrls;

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
        <ImageIcon className="w-3 h-3 stroke-[2.25]" />
        <span className="text-[10px] font-bold">x{activeImages.length}</span>
      </button>
    );
  }

  // 有効な音声
  const activeAudios = effectiveIsFlipped ? answerAudios : questionAudios;

  // データ構造の正規化（urlプロパティを持つオブジェクトか、文字列か）
  const toMediaUrl = React.useCallback((m: FlashcardMediaLike): string | null => {
    if (typeof m === 'string') return m;
    return m.remoteUrl ?? m.localUrl ?? m.url ?? null;
  }, []);

  const activeAudioUrls = React.useMemo(
    () => (activeAudios ?? []).map(toMediaUrl).filter((u): u is string => Boolean(u)),
    [activeAudios, toMediaUrl]
  );

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
        <Volume2 className="w-3 h-3 stroke-[2.25]" />
        <span className="text-[10px] font-bold">x{activeAudioUrls.length}</span>
      </button>
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
        <LinkIcon className="w-3 h-3 stroke-[2.25]" />
        <span className="text-[10px] font-bold">x{activeReferences.length}</span>
      </button>
    );
  }

  if (mediaActionNodes.length > 0) {
    actionsTopRight.push(
      <div key="media-actions" className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {mediaActionNodes}
      </div>
    );
  }

  // アクション表示（編集(onEdit)以外はプレビューでも表示）
  if (onToggleUncertainty || onToggleBookmark) {
    actionsTopLeft.push(
      <CardCornerActions
        key="corner-actions"
        onHelp={onToggleUncertainty ? () => onToggleUncertainty(cardData) : undefined}
        onStar={onToggleBookmark ? () => onToggleBookmark(cardData) : undefined}
        helpActive={hasUncertainty}
        starActive={isBookmarked}
      />
    );
  }

  if (onEdit && !previewMode) {
    actionsTopRight.push(
      <Button
        key="edit"
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(cardData);
        }}
        className="rounded-full w-8 h-8 md:w-9 h-9 bg-slate-50/80 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
      >
        <Pencil className="w-4 h-4 md:w-5 h-5" />
      </Button>
    );
  }

  const resolveSideBlocks = React.useCallback(
    (side: 'question' | 'answer'): CardBlock[] => {
      const sideBlocks =
        side === 'question'
          ? (cardData?.questionBlocks ?? [])
          : (cardData?.answerBlocks ?? []);
      if (sideBlocks.length > 0) {
        return sortBlocksByOrderIndex(sideBlocks);
      }

      const text = side === 'question' ? questionText : answerText;
      const images = side === 'question' ? questionImageUrls : answerImageUrls;
      const audios = side === 'question' ? questionAudios : answerAudios;
      const code = side === 'question' ? questionCode : answerCode;

      const fallbackBlocks: CardBlock[] = [];
      let orderIndex = 0;

      if ((text ?? '').trim() !== '') {
        fallbackBlocks.push({
          id: `${side}-legacy-text`,
          type: 'text',
          orderIndex: orderIndex++,
          content: String(text),
        } as CardBlock);
      }

      if ((code?.code ?? '').trim() !== '') {
        fallbackBlocks.push({
          id: `${side}-legacy-code`,
          type: 'code',
          orderIndex: orderIndex++,
          code,
        } as CardBlock);
      }

      if ((images?.length ?? 0) > 0) {
        fallbackBlocks.push({
          id: `${side}-legacy-image`,
          type: 'image',
          orderIndex: orderIndex++,
          images: images as any,
        } as CardBlock);
      }

      if ((audios?.length ?? 0) > 0) {
        fallbackBlocks.push({
          id: `${side}-legacy-audio`,
          type: 'audio',
          orderIndex,
          audios: audios as any,
        } as CardBlock);
      }

      return fallbackBlocks;
    },
    [
      answerAudios,
      answerCode,
      answerImageUrls,
      answerText,
      cardData?.answerBlocks,
      cardData?.questionBlocks,
      questionAudios,
      questionCode,
      questionImageUrls,
      questionText,
    ]
  );

  // overlay を安定化（Inkが余計に再マウント/再描画されにくい）
  const overlayNode = React.useMemo(() => {
    const hasHeaderOverlay = Boolean(extraHeaderRight && !previewMode);
    const hasFooterOverlay = Boolean(extraFooter);
    const hasInkOverlay = Boolean(previewMode && inkEditingEnabled && cardIdForInk);
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
                editable={Boolean(previewMode && inkEditingEnabled && layoutStable)}
                tool={previewInkTool ?? 'pen'}
                value={activeInkDocument}
                onChange={(next) => handleInkDocumentChange(activeInkSide, next)}
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
  ]);

  const fixedHeightPx = layoutRowsToCardHeightPx(layoutRows);
  const activeSide: 'question' | 'answer' = effectiveIsFlipped ? 'answer' : 'question';
  const activeBlocks = resolveSideBlocks(activeSide);

  return (
    <div className={cn('w-full flex flex-col select-none overflow-visible', className)}>
      <div className="relative">
        <CardFrame
          baseWidth={CANONICAL_CARD_WIDTH}
          className={cn('premium-paper-depth', !previewMode && 'cursor-pointer', 'card-shell--paper')}
          onClick={handleFlip}
          resizable={false}
          resizeStepPx={undefined}
          showResizeHandle={false}
          heightPx={fixedHeightPx}
          lockHeight
          actionsTopLeft={actionsTopLeft.length > 0 ? actionsTopLeft : undefined}
          actionsTopRight={actionsTopRight.length > 0 ? actionsTopRight : undefined}
          drawMode={enableDrawMode}
          overlay={overlayNode}
        >
          <div ref={contentRef} className="animate-in fade-in zoom-in-95 duration-300 w-full max-w-full flex min-h-0 flex-1">
            <SharedCardContent
              mode="view"
              blocks={activeBlocks}
              onGalleryFullscreenChange={handleGalleryFullscreenChange}
            />
          </div>
        </CardFrame>
      </div>

      <ReferencePopup
        isOpen={isReferencePopupOpen}
        onClose={() => setIsReferencePopupOpen(false)}
        references={activeReferences}
      />

      <Dialog open={isImagePopupOpen} onOpenChange={setIsImagePopupOpen}>
        <DialogContent className="max-w-5xl w-full p-0 bg-transparent border-none shadow-none max-h-[90vh] overflow-y-auto">
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-2xl relative min-h-[200px]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10 rounded-full bg-slate-100/80 hover:bg-slate-200 text-slate-500"
              onClick={() => setIsImagePopupOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
            <div className="mt-8 space-y-4">
              {activeImages.map((url, index) => (
                <div key={`${url}-${index}`} className="w-full">
                  <img
                    src={url}
                    alt={`Image ${index + 1}`}
                    className="w-full h-auto rounded-lg border border-slate-100 shadow-sm"
                  />
                </div>
              ))}
            </div>
            {activeImages.length === 0 && <div className="flex items-center justify-center py-20 text-slate-400">画像がありません</div>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAudioPopupOpen} onOpenChange={setIsAudioPopupOpen}>
        <DialogContent className="sm:max-w-md w-full bg-white border-none shadow-2xl p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-amber-500" />
              音声再生
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-slate-100 text-slate-400"
              onClick={() => setIsAudioPopupOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="py-2">
            <AudioPlayer urls={activeAudioUrls} />
          </div>

          {activeAudioUrls.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">音声がありません</div>}
        </DialogContent>
      </Dialog>

      {/* ナビゲーション（オプション） - プレビュー時は非表示 */}
      {!previewMode && (onNext || onPrev || (currentIndex !== undefined && totalCards !== undefined)) && (
        <div className="flex items-center justify-between mt-8 px-4">
          <Button
            variant="ghost"
            onClick={onPrev}
            disabled={!hasPrev && (!onPrev || (currentIndex !== undefined && currentIndex === 0))}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full h-12 px-6"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Previous</span>
          </Button>

          {currentIndex !== undefined && totalCards !== undefined && (
            <span className="text-sm font-bold text-slate-300 tracking-widest">
              {currentIndex + 1} / {totalCards}
            </span>
          )}

          <Button
            variant="ghost"
            onClick={onNext}
            disabled={!hasNext && (!onNext || (currentIndex !== undefined && totalCards !== undefined && currentIndex === totalCards - 1))}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full h-12 px-6"
          >
            <span className="font-medium">Next</span>
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}