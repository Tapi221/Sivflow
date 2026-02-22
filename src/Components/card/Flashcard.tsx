import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/Components/ui/button';
import { CardShell } from './CardShell';
import { ChevronLeft, ChevronRight, Pencil, RotateCcw, Image as ImageIcon, X, Volume2 } from 'lucide-react';
import Star from 'lucide-react/dist/esm/icons/star';
import CircleHelp from 'lucide-react/dist/esm/icons/circle-help';
import LinkIcon from 'lucide-react/dist/esm/icons/link';

import { Dialog, DialogContent } from '@/Components/ui/dialog';
import { MathRenderer } from './blocks/MathRenderer';
import { MarkdownBlockView } from './blocks/MarkdownBlockView';
import { cn } from '@/lib/utils';
import { CodeRenderer } from './CodeRenderer';
import { AudioPlayer, ImageGallery } from './CardMedia';
import { useTags } from '@/hooks/useTags';
import { useUserSettings } from '@/hooks/useUserSettings';
import { ReferencePopup } from './ReferencePopup';
import type { CardBlock, ReferenceBlockData } from '@/types';
import { normalizeCard } from '@/utils';
import { CardSurface } from "./CardSurface";
import { PaperCardScaleFrame } from './PaperCardScaleFrame';
import { TagBadge } from '@/Components/tag/TagBadge';
import { InkLayer, InkToolbar, type InkHistoryState, type InkLayerHandle } from '@/Components/ink/InkLayer';
import { resolveInkDocument } from '@/Components/ink/inkStorage';
import type { InkDocument, InkEditTool } from '@/Components/ink/inkTypes';

interface FlashcardProps {
  card: any;
  isFlipped?: boolean;
  onFlip?: () => void;
  onEdit?: (card: any) => void;
  onToggleUncertainty?: (card: any) => void;
  onToggleBookmark?: (card: any) => void;
  onTagClick?: (tag: string) => void;
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
  /** エディタから渡される共有高さ（プレビューで優先利用） */
  editorSharedHeightPx?: number | null;
  lockCardHeight?: boolean;
  showTags?: boolean;
}

export function Flashcard({
  card,
  isFlipped,
  onFlip,
  onEdit,
  onToggleUncertainty,
  onToggleBookmark,
  onTagClick,
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
  editorSharedHeightPx,
  lockCardHeight = false,
  showTags = true,
}: FlashcardProps) {
  const { settings } = useUserSettings();
  const { getTagColor } = useTags();
  // ✅ ここが重要：プレビューは CardEditor の formData をそのまま使う
  // normalizeCard が blocks を潰す実装だと「…しか出ない」になる
  const cardData = React.useMemo(() => {
    if (!card) return card;
    return previewMode ? card : normalizeCard(card);
  }, [card, previewMode]);

  const [previewFlipped, setPreviewFlipped] = useState(false);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isReferencePopupOpen, setIsReferencePopupOpen] = useState(false);
  const [isImagePopupOpen, setIsImagePopupOpen] = useState(false);
  const [isAudioPopupOpen, setIsAudioPopupOpen] = useState(false);
  const previewInkRef = useRef<InkLayerHandle | null>(null);
  const [previewInkTool, setPreviewInkTool] = useState<InkEditTool | null>(null);
  const [previewInkHistory, setPreviewInkHistory] = useState<InkHistoryState>({
    canUndo: false,
    canRedo: false,
    strokeCount: 0,
  });

  // プレビュー時にエディタの共有リサイズ高さを反映するための state
  const [sharedPreviewHeightPx, setSharedPreviewHeightPx] = useState<number | null>(null);

  useEffect(() => {
    if (!previewMode) return;
    setPreviewFlipped(false);
  }, [previewMode, card?.id]);

  useEffect(() => {
    if (!inkEditingEnabled) {
      setPreviewInkTool(null);
    }
  }, [inkEditingEnabled]);

  // エディタから直接渡された高さがあれば優先して使用
  // プレビューモード以外でも適用する
  useEffect(() => {
    if (editorSharedHeightPx != null) {
      setSharedPreviewHeightPx(editorSharedHeightPx);
      return;
    }

    // editorSharedHeightPx がない場合は userSettings / localStorage から復元
    if (settings?.cardEditorHeightPx != null) {
      setSharedPreviewHeightPx(settings.cardEditorHeightPx);
      return;
    }

    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem('card-editor.resize:shared-height');
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        setSharedPreviewHeightPx(parsed);
      }
    }
  }, [card?.id, editorSharedHeightPx, settings?.cardEditorHeightPx]);

  // 参考リンク抽出
  const questionReferences = React.useMemo(() => {
    const refs: ReferenceBlockData[] = [];
    const qBlocks: CardBlock[] = cardData?.questionBlocks ?? [];
    qBlocks.forEach(block => {
      if (block.type === 'reference' && block.references) refs.push(...block.references);
    });
    return refs.filter(r => r.url);
  }, [cardData?.questionBlocks]);

  const answerReferences = React.useMemo(() => {
    const refs: ReferenceBlockData[] = [];
    const aBlocks: CardBlock[] = cardData?.answerBlocks ?? [];
    aBlocks.forEach(block => {
      if (block.type === 'reference' && block.references) refs.push(...block.references);
    });
    return refs.filter(r => r.url);
  }, [cardData?.answerBlocks]);

  // 安全なプロパティアクセス（異なる命名規則への対応）
  const hasUncertainty = card?.has_uncertainty ?? card?.hasUncertainty ?? false;
  const isBookmarked = card?.is_bookmarked ?? card?.isBookmarked ?? false;

  const questionText = cardData?.question_text ?? cardData?.questionText ?? '';
  const questionImages = cardData?.question_images ?? cardData?.questionImages ?? [];
  const questionAudios = cardData?.question_audios ?? cardData?.questionAudios ?? [];
  const questionMemo = cardData?.question_memo ?? cardData?.questionMemo ?? '';

  const answerText = cardData?.answer_text ?? cardData?.answerText ?? '';
  const answerImages = cardData?.answer_images ?? cardData?.answerImages ?? [];
  const answerAudios = cardData?.answer_audios ?? cardData?.answerAudios ?? [];
  const answerMemo = cardData?.answer_memo ?? cardData?.answerMemo ?? '';

  const questionCode = cardData?.questionCode || cardData?.question_code || null;
  const answerCode = cardData?.answerCode || cardData?.answer_code || null;
  const cardIdForInk = cardData?.id ?? cardData?.cardId ?? null;

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

  const handleGalleryFullscreenChange = (isFullscreen: boolean) => {
    setIsImageModalOpen(isFullscreen);
  };

  const handleFlip = (e?: React.MouseEvent) => {
    if (isImageModalOpen) return;
    if (previewMode && inkEditingEnabled) return;

    if (onFlip) {
      e?.stopPropagation();
      onFlip();
      return;
    }

    if (previewMode) {
      e?.stopPropagation();
      setPreviewFlipped((prev) => !prev);
    }
  };

  if (!cardData) {
    return <div className="text-center py-12 text-gray-500">No Card Data</div>;
  }

  // Preview should prioritize native scroll behavior over pan/zoom gestures.
  const enableDrawMode = drawMode ?? false;

  const effectiveIsFlipped = isFlipped ?? (previewMode ? previewFlipped : false);
  const activeReferences = effectiveIsFlipped ? answerReferences : questionReferences;
  const activeInkSide = effectiveIsFlipped ? 'answer' : 'question';
  const activeInkDocument = effectiveIsFlipped ? answerInkDocument : questionInkDocument;

  const actionsTopLeft: React.ReactNode[] = [];
  const actionsTopRight: React.ReactNode[] = [];
  const actionsBottomRight: React.ReactNode[] = [];
  const mediaActionNodes: React.ReactNode[] = [];

  if (extraHeaderLeft) {
    actionsBottomRight.push(
      <div key="extra-left" className="flex" onClick={(e) => e.stopPropagation()}>
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
        title="画像を表示"
      >
        <ImageIcon className="w-3 h-3 stroke-[2.25]" />
        <span className="text-[10px] font-bold">x{activeImages.length}</span>
      </button>
    );
  }

  // 有効な音声
  const activeAudios = effectiveIsFlipped ? answerAudios : questionAudios;

  // データ構造の正規化（urlプロパティを持つオブジェクトか、文字列か）
  const activeAudioUrls = activeAudios.map((a: any) => a.remoteUrl || a.localUrl || a.url || a).filter(Boolean);

  if (activeAudioUrls.length > 0) {
    mediaActionNodes.push(
      <button
        key="audios"
        onClick={(e) => {
          e.stopPropagation();
          setIsAudioPopupOpen(true);
        }}
        className="flex items-center gap-1 px-2 py-1 h-8 min-h-0 min-w-0 rounded-full transition-all bg-amber-500 text-white shadow-[0_2px_0_#b45309] active:shadow-none active:translate-y-[2px] hover:bg-amber-400 hover:shadow-[0_2px_0_#b45309]"
        title={`音声 (x${activeAudioUrls.length})`}
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
        title={`参考リンク (x${activeReferences.length})`}
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
  if (onToggleUncertainty) {
    actionsTopLeft.push(
      <button
        key="uncertainty"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleUncertainty(cardData);
        }}
        className={cn(
          "rounded-full w-6 h-6 min-w-0 min-h-0 transition-colors flex items-center justify-center",
          hasUncertainty
            ? "bg-amber-100 text-amber-600 hover:bg-amber-200 border-none"
            : "bg-slate-50/80 text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-transparent"
        )}
        title="曖昧/要復習"
      >
        <CircleHelp className={cn("w-3 h-3", hasUncertainty && "fill-current/20")} />
      </button>
    );
  }

  if (onToggleBookmark) {
    actionsTopLeft.push(
      <button
        key="bookmark"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleBookmark(cardData);
        }}
        className={cn(
          "rounded-full w-6 h-6 min-w-0 min-h-0 transition-colors flex items-center justify-center",
          isBookmarked
            ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200 border-none"
            : "bg-slate-50/80 text-slate-400 hover:bg-primary-600/10 hover:text-primary-600 border border-transparent"
        )}
        title="ブックマーク"
      >
        <Star className={cn("w-3 h-3", isBookmarked && "fill-current")} />
      </button>
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
        title="編集"
      >
        <Pencil className="w-4 h-4 md:w-5 h-5" />
      </Button>
    );
  }

  // blocks描画（空は何も出さない。白紙維持）
  const renderMultilineText = (text: string) => {
    const normalized = String(text ?? '').replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');

    return (
      <div
        className="w-full min-h-[24px] px-1.5 py-0 text-center text-base font-medium text-slate-700 font-serif"
        style={{ lineHeight: '24px' }}
      >
        {lines.map((line, lineIndex) => {
          return (
            <div key={`line-${lineIndex}`} className="whitespace-pre-wrap break-all leading-[24px]">
              {line === '' ? '\u00A0' : line}
            </div>
          );
        })}
      </div>
    );
  };

  const renderBlocks = (blocks: CardBlock[] | undefined) => {
    if (!blocks || blocks.length === 0) return null;

    const getRowOffset = (block: CardBlock) => Math.round(Number(block.rowOffset ?? 0));
    const ROW_STEP_PX = 24;

    return (
      <div className="space-y-0 w-full max-w-full">
        {blocks.map((block) => {
          const isLinePositionable = block.type === 'text' || block.type === 'code';
          const rowOffsetPx = isLinePositionable ? getRowOffset(block) * ROW_STEP_PX : 0;
          const offsetTransform = rowOffsetPx !== 0 ? `translateY(${rowOffsetPx}px)` : '';

          return (
          <div 
            key={block.id} 
            className="w-full min-w-0 max-w-full"
            data-block-row="true"
            style={offsetTransform ? { transform: offsetTransform } : undefined}
          >
            {block.type === 'text' && (block.content ?? '').trim() !== '' && (
              <div className="w-full max-w-full overflow-hidden">
                {renderMultilineText(String(block.content ?? ''))}
              </div>
            )}

            {block.type === 'code' && (block.code?.code ?? '').trim() !== '' && (
              <div className="w-full max-w-full overflow-hidden">
                <CodeRenderer code={block.code!.code} language={block.code!.language} />
              </div>
            )}

            {block.type === 'image' && (block.images?.length ?? 0) > 0 && (
              <ImageGallery
                urls={(block.images ?? []).map((img: any) => img.remoteUrl || img.localUrl || img.url || img)}
                onFullscreenChange={handleGalleryFullscreenChange}
              />
            )}

            {block.type === 'audio' && (block.audios?.length ?? 0) > 0 && (
              <div className="flex justify-center">
                <AudioPlayer urls={(block.audios ?? []).map((a: any) => a.remoteUrl || a.localUrl || a.url || a)} />
              </div>
            )}

            {block.type === 'memo' && (block.content ?? '').trim() !== '' && (
              <div className="p-4 bg-slate-50 rounded-2xl text-sm text-slate-600 text-left whitespace-pre-wrap break-all border border-slate-100/50">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Memo</div>
                {block.content}
              </div>
            )}

            {block.type === 'math' && (block.math?.latex ?? '').trim() !== '' && (
              <div className="py-2 flex justify-center">
                <MathRenderer
                  latex={block.math!.latex || ''}
                  displayMode={block.math!.displayMode || 'block'}
                  className="text-slate-800"
                />
              </div>
            )}

            {block.type === 'markdown' && (block.markdown ?? '').trim() !== '' && (
              <div className="markdownBlockSurface w-full max-w-full bg-transparent overflow-visible">
                <div className="w-full max-w-full px-1.5 py-0">
                  <MarkdownBlockView md={block.markdown!} className="markdownBlockCardView" />
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>
    );
  };

  // レガシー描画（blocksが空のときのフォールバック）
  const renderLegacy = (side: 'question' | 'answer') => {
    const text = side === 'question' ? questionText : answerText;
    const images = side === 'question' ? questionImageUrls : answerImageUrls;
    const audios = side === 'question' ? (questionAudios ?? []) : (answerAudios ?? []);
    const memo = side === 'question' ? questionMemo : answerMemo;
    const code = side === 'question' ? questionCode : answerCode;

    const hasAny =
      (text ?? '').trim() !== '' ||
      (images?.length ?? 0) > 0 ||
      (audios?.length ?? 0) > 0 ||
      (memo ?? '').trim() !== '' ||
      (code?.code ?? '').trim() !== '';

    if (!hasAny) return null;

    return (
      <div className="space-y-0 w-full max-w-full">
        {(text ?? '').trim() !== '' && (
          renderMultilineText(String(text))
        )}

        {(code?.code ?? '').trim() !== '' && (
          <div className="w-full max-w-full overflow-hidden">
            <CodeRenderer code={code.code} language={code.language} />
          </div>
        )}

        {(images?.length ?? 0) > 0 && (
          <ImageGallery urls={images} onFullscreenChange={handleGalleryFullscreenChange} />
        )}

        {(audios?.length ?? 0) > 0 && (
          <div className="flex justify-center">
            <AudioPlayer urls={audios.map((a: any) => a.remoteUrl || a.localUrl || a.url || a)} />
          </div>
        )}

        {(memo ?? '').trim() !== '' && (
          <div className="p-4 bg-slate-50 rounded-2xl text-sm text-slate-600 text-left whitespace-pre-wrap break-all border border-slate-100/50">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Memo</div>
            {memo}
          </div>
        )}
      </div>
    );
  };

  const renderSide = (side: 'question' | 'answer') => {
    const blocks = side === 'question' ? (cardData?.questionBlocks ?? []) : (cardData?.answerBlocks ?? []);
    const blocksNode = renderBlocks(blocks);
    if (blocksNode) return blocksNode;
    return renderLegacy(side);
  };

  const shellRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!previewMode) return;
    if (!shellRef.current) return;
    try {
      const shell = shellRef.current;
      const body = shell.querySelector('.card-shell-body') as HTMLElement | null;
      console.debug('[Flashcard] shell width', shell.clientWidth, 'body width', body?.clientWidth);
    } catch (e) {
      // ignore
    }
  }, [previewMode, sharedPreviewHeightPx, card?.id]);

  return (
    <div className={cn("w-full h-full flex flex-col select-none", className)}>
      {/* カード外ヘッダー（右上要素の移動先） */}
      {!previewMode && (
        <div className="w-full flex justify-end px-2 pb-2 min-h-[40px]">
          <div className="flex flex-col items-end gap-2">
            {extraHeaderRight}

            {/* タグ表示 */}
            {showTags && cardData?.tags && Array.isArray(cardData.tags) && cardData.tags.length > 0 && (
              <div className="flex flex-wrap justify-end gap-1.5 animate-in fade-in slide-in-from-right-2 duration-500 delay-150 max-w-[200px] md:max-w-xs">
                {cardData.tags.map((tag: string, i: number) => (
                  <button
                    key={`${tag}-${i}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagClick?.(tag);
                    }}
                    className="outline-none"
                  >
                    <TagBadge
                      label={tag}
                      size="md"
                      colorClass={getTagColor(tag)}
                      className="max-w-full"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <PaperCardScaleFrame baseWidth={480}>
        <CardShell
          className={cn(
            "mx-auto border-none rounded-[32px] md:rounded-[40px] overflow-hidden transition-all duration-300",
            "premium-paper-depth",
            !previewMode && "premium-paper-depth--hover cursor-pointer",
            "card-shell--paper"
          )}
          ref={shellRef}
          onClick={handleFlip}
          // プレビュー時はリサイズ不可にする（変な横線を防ぐ）
          resizable={false}
          resizeStepPx={undefined}
          showResizeHandle={false}
          // プレビュー時は編集で設定された高さを反映する
          heightPx={sharedPreviewHeightPx}
          lockHeight={lockCardHeight}
          bodyOverflowY="auto"
          actionsTopLeft={actionsTopLeft.length > 0 ? actionsTopLeft : undefined}
          actionsTopRight={actionsTopRight.length > 0 ? actionsTopRight : undefined}
          actionsBottomRight={actionsBottomRight.length > 0 ? actionsBottomRight : undefined}
          drawMode={enableDrawMode}
        >
          <CardSurface
            ruled={true}
            ruledOffsetPx={24}
            overlay={
              <>
                <InkLayer
                  ref={previewInkRef}
                  cardId={cardIdForInk}
                  side={activeInkSide}
                  editable={Boolean(previewMode && inkEditingEnabled && previewInkTool)}
                  tool={previewInkTool ?? 'pen'}
                  document={activeInkDocument}
                  onDocumentChange={(next) => onInkDocumentChange?.(activeInkSide, next)}
                  onHistoryChange={setPreviewInkHistory}
                  className={cn(previewMode && inkEditingEnabled ? '' : 'pointer-events-none')}
                />
                {previewMode && inkEditingEnabled && (
                  <div className="absolute bottom-2 left-2 z-30">
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
            }
          >
            {/* コンテンツエリア - 編集画面に揃えて上寄せ */}
            <div
              className={cn(
                "paperCardTypography flex-1 flex flex-col max-w-full mx-auto w-full pb-8 overflow-x-clip overflow-y-visible pt-6"
              )}
            >
              {effectiveIsFlipped ? (
                <div className="animate-in fade-in zoom-in-95 duration-300 w-full max-w-full">
                  {renderSide('answer')}
                </div>
              ) : (
                <div className="animate-in fade-in zoom-in-95 duration-300 w-full max-w-full">
                  {renderSide('question')}
                </div>
              )}
            </div>

            {/* フッター */}
            <div className="mt-auto pt-4 text-center">
              {extraFooter}

              {/* ここは必要なら後で描画UI（draw tools）を入れる枠 */}
              {previewMode && (
                <div className="flex gap-4 justify-center">
                  {/* intentionally empty */}
                </div>
              )}
            </div>
          </CardSurface>
        </CardShell>
      </PaperCardScaleFrame>

      {/* カード直下の「Back to Question」 */}
      {!previewMode && effectiveIsFlipped && (
        <div className="w-full flex justify-center pt-2">
          <Button
            variant="ghost"
            className="text-[10px] font-bold tracking-widest text-slate-400 hover:text-slate-600 uppercase flex items-center gap-2 bg-slate-50/50 px-3 py-1 rounded-full"
            onClick={handleFlip}
          >
            <RotateCcw className="w-3 h-3" />
            Back to Question
          </Button>
        </div>
      )}

      {/* カード直下のガイダンステキスト */}
      {!previewMode && !effectiveIsFlipped && (
        <div className="w-full flex justify-center pt-2">
          <p className="text-sm text-slate-400 animate-pulse">Click card to reveal answer</p>
        </div>
      )}

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
                <div key={index} className="w-full">
                  <img 
                    src={url} 
                    alt={`Image ${index + 1}`} 
                    className="w-full h-auto rounded-lg border border-slate-100 shadow-sm"
                  />
                </div>
              ))}
            </div>
            {activeImages.length === 0 && (
               <div className="flex items-center justify-center py-20 text-slate-400">
                 画像がありません
               </div>
            )}
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
            
            {activeAudioUrls.length === 0 && (
               <div className="text-center py-8 text-slate-400 text-sm">
                 音声がありません
               </div>
            )}
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
