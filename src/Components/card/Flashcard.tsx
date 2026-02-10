import React, { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { CardShell } from './CardShell';
import { ChevronLeft, ChevronRight, HelpCircle, Pencil, RotateCcw, Bookmark, Tag } from 'lucide-react';
import { MathRenderer } from './blocks/MathRenderer';
import { cn } from '@/lib/utils';
import { CodeRenderer } from './CodeRenderer';
import { AudioPlayer, ImageGallery } from './CardMedia';
import { useTags } from '@/hooks/useTags';
import { ReferencePopup } from './ReferencePopup';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import type { CardBlock, ReferenceBlockData } from '@/types';
import { normalizeCard } from '@/utils';

interface FlashcardProps {
  card: any;
  isFlipped?: boolean;
  onFlip?: () => void;
  onEdit?: (card: any) => void;
  onToggleUncertainty?: (card: any) => void;
  onToggleBookmark?: (card: any) => void;
  onTagClick?: (tag: string) => void;
  className?: string;
  showNavigation?: boolean; // If true, show nav buttons (handled by parent usually, but maybe internal for some cases)
  // Navigation props if managed internally or passed down
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  currentIndex?: number;
  totalCards?: number;
  previewMode?: boolean; // If true, disable some interactive logic or adjust UI
  extraHeaderLeft?: React.ReactNode;
  extraHeaderRight?: React.ReactNode;
  extraFooter?: React.ReactNode;
  drawMode?: boolean;
}

function TagBadge({ tag }: { tag: string }) {
    const { getTagColor } = useTags();
    const colorClass = getTagColor(tag);
    
    return (
        <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors", colorClass)}>
            <Tag className="w-3 h-3 opacity-50" />
            {tag}
        </div>
    );
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
  drawMode
}: FlashcardProps) {
  // データを正規化してレガシーフィールドとブロックの両方を確実に扱う
  const normalizedCard = React.useMemo(() => normalizeCard(card), [card]);
  const [isMobile, setIsMobile] = useState(false);
  const [previewFlipped, setPreviewFlipped] = useState(false);
  
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isReferencePopupOpen, setIsReferencePopupOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }
    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  useEffect(() => {
    if (!previewMode) return;
    setPreviewFlipped(false);
  }, [previewMode, card?.id]);

  // 以下、normalizedCard を使用するように変数を再定義
  const cardData = normalizedCard;


  const questionReferences = React.useMemo(() => {
    const refs: ReferenceBlockData[] = [];
    const qBlocks: CardBlock[] = cardData?.questionBlocks ?? [];
    qBlocks.forEach(block => {
      if (block.type === 'reference' && block.references) {
        refs.push(...block.references);
      }
    });
    return refs.filter(r => r.url);
  }, [cardData?.questionBlocks]);

  const answerReferences = React.useMemo(() => {
    const refs: ReferenceBlockData[] = [];
    const aBlocks: CardBlock[] = cardData?.answerBlocks ?? [];
    aBlocks.forEach(block => {
      if (block.type === 'reference' && block.references) {
        refs.push(...block.references);
      }
    });
    return refs.filter(r => r.url);
  }, [cardData?.answerBlocks]);

  // 安全なプロパティアクセス（異なる命名規則への対応）
  const isDraft = card?.is_draft ?? card?.isDraft ?? false;
  const hasUncertainty = card?.has_uncertainty ?? card?.hasUncertainty ?? false;
  const isBookmarked = card?.is_bookmarked ?? card?.isBookmarked ?? false;
  
  const questionText = card?.question_text ?? card?.questionText ?? '';
  const questionImages = card?.question_images ?? card?.questionImages ?? [];
  const questionAudios = card?.question_audios ?? card?.questionAudios ?? [];
  const questionMemo = card?.question_memo ?? card?.questionMemo ?? '';
  
  const answerText = card?.answer_text ?? card?.answerText ?? '';
  const answerImages = card?.answer_images ?? card?.answerImages ?? [];
  const answerAudios = card?.answer_audios ?? card?.answerAudios ?? [];
  const answerMemo = card?.answer_memo ?? card?.answerMemo ?? '';
  
  const questionCode = card?.questionCode || card?.question_code || null;
  const answerCode = card?.answerCode || card?.answer_code || null;

  const questionImageUrls = (questionImages ?? [])
    .map((image: any) => image?.remoteUrl ?? image?.localUrl ?? image?.url ?? image)
    .filter(Boolean);
  const answerImageUrls = (answerImages ?? [])
    .map((image: any) => image?.remoteUrl ?? image?.localUrl ?? image?.url ?? image)
    .filter(Boolean);

  // 判定ロジックの強化：ブロックがあるか、またはレガシーコンテンツがあるか
  const hasQuestionContent = (cardData.questionBlocks?.length > 0) || questionText || questionImageUrls.length > 0 || questionAudios.length > 0 || questionCode?.code;
  const hasAnswerContent = (cardData.answerBlocks?.length > 0) || answerText || answerImageUrls.length > 0 || answerAudios.length > 0 || answerCode?.code;

  // ブロックを描画するヘルパー
  const renderBlocks = (blocks: CardBlock[]) => {
    if (!blocks || blocks.length === 0) return null;
    return (
      <div className="space-y-6 w-full">
        {blocks.map((block) => (
          <div key={block.id} className="w-full min-w-0">
            {block.type === 'text' && block.content && (
              <div className="w-full max-w-2xl mx-auto text-left">
                <MathRenderer 
                  latex={block.content} 
                  displayMode="inline"
                  className="text-[clamp(1.125rem,4vw,1.5rem)] md:text-2xl font-medium text-slate-700 leading-relaxed font-serif break-all"
                />
              </div>
            )}
            {block.type === 'code' && block.code?.code && (
              <div className="text-left w-full max-w-2xl mx-auto">
                <CodeRenderer code={block.code.code} language={block.code.language} />
              </div>
            )}
            {block.type === 'image' && block.images && block.images.length > 0 && (
              <ImageGallery 
                urls={block.images.map((img: any) => img.remoteUrl || img.localUrl || img.url || img)} 
                onFullscreenChange={handleGalleryFullscreenChange} 
              />
            )}
            {block.type === 'audio' && block.audios && block.audios.length > 0 && (
              <div className="flex justify-center">
                <AudioPlayer urls={block.audios.map((audio: any) => audio.remoteUrl || audio.localUrl || audio.url || audio)} />
              </div>
            )}
            {block.type === 'memo' && block.content && (
              <div className="p-4 bg-slate-50 rounded-2xl text-sm text-slate-600 text-left whitespace-pre-wrap break-all border border-slate-100/50">
                 <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Memo</div>
                 {block.content}
              </div>
            )}
            {block.type === 'math' && block.math && (
              <div className="py-2 flex justify-center">
                <MathRenderer 
                  latex={block.math.latex || ''} 
                  displayMode={block.math.displayMode || 'block'}
                  className="text-slate-800"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };


  const handleFlip = (e?: React.MouseEvent) => {
    if (isImageModalOpen) return;
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

  const handleGalleryFullscreenChange = (isFullscreen: boolean) => {
      setIsImageModalOpen(isFullscreen);
  };

  if (!card) return <div className="text-center py-12 text-gray-500">No Card Data</div>;

  const enableDrawMode = drawMode ?? (previewMode && isMobile);

  const effectiveIsFlipped = isFlipped ?? (previewMode ? previewFlipped : false);
  const actionsTopLeft: React.ReactNode[] = [];
  const actionsTopRight: React.ReactNode[] = [];
  const actionsBottomRight: React.ReactNode[] = [];

  if (extraHeaderLeft) {
    actionsBottomRight.push(
      <div key="extra-left" className="flex" onClick={(e) => e.stopPropagation()}>
        {extraHeaderLeft}
      </div>
    );
  }

  const activeReferences = effectiveIsFlipped ? answerReferences : questionReferences;

  if (activeReferences.length > 0) {
    actionsBottomRight.push(
      <button
        key="references"
        onClick={(e) => {
          e.stopPropagation();
          setIsReferencePopupOpen(true);
        }}
        className="flex items-center gap-1 px-2 py-1 h-8 min-h-0 min-w-0 rounded-full bg-primary-600 text-white shadow-[0_2px_0_#1e293b] active:shadow-none active:translate-y-[2px] transition-all hover:bg-primary-500 hover:shadow-[0_2px_0_#1e293b]"
        title="参考リンクを表示"
      >
        <LinkIcon className="w-3 h-3 stroke-[2.25]" />
        <span className="text-[10px] font-bold">x{activeReferences.length}</span>
      </button>
    );
  }

  if (!previewMode) {
    if (onToggleUncertainty) {
      actionsTopLeft.push(
        <Button
          key="uncertainty"
          variant={hasUncertainty ? "default" : "ghost"}
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onToggleUncertainty(card);
          }}
          className={cn(
            "rounded-full w-9 h-9 md:w-11 md:h-11 transition-colors",
            hasUncertainty 
              ? "bg-amber-400 hover:bg-amber-500 text-white shadow-md border-none" 
              : "bg-slate-50/80 text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-transparent"
          )}
          title="曖昧/要復習"
        >
          <HelpCircle className="w-5 h-5 md:w-5 md:h-5 scale-90 md:scale-100" />
        </Button>
      );
    }

    if (onToggleBookmark) {
      actionsTopLeft.push(
        <Button
          key="bookmark"
          variant={isBookmarked ? "default" : "ghost"}
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark(card);
          }}
          className={cn(
            "rounded-full w-9 h-9 md:w-11 md:h-11 transition-colors",
            isBookmarked 
              ? "bg-primary-600 hover:bg-primary-700 text-white shadow-md border-none" 
              : "bg-slate-50/80 text-slate-400 hover:bg-primary-600/10 hover:text-primary-600 border border-transparent"
          )}
          title="ブックマーク"
        >
          <Bookmark className={cn("w-5 h-5 md:w-5 md:h-5 scale-90 md:scale-100", isBookmarked && "fill-current")} />
        </Button>
      );
    }

    if (onEdit) {
      actionsTopRight.push(
        <Button
          key="edit"
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(card);
          }}
          className="rounded-full w-9 h-9 md:w-11 md:h-11 bg-slate-50/80 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          title="編集"
        >
          <Pencil className="w-5 h-5 md:w-5 md:h-5 scale-90 md:scale-100" />
        </Button>
      );
    }
  }

  return (
    <div className={cn("w-full h-full flex flex-col select-none", className)}>
      {/* カード外ヘッダー（右上要素の移動先） */}
      {!previewMode && (
        <div className="w-full flex justify-end px-2 pb-2 min-h-[40px]">
          <div className="flex flex-col items-end gap-2">
               {extraHeaderRight}
              
              {/* タグ表示 */}
              {card?.tags && card.tags.length > 0 && (
                  <div className="flex flex-wrap justify-end gap-1.5 animate-in fade-in slide-in-from-right-2 duration-500 delay-150 max-w-[200px] md:max-w-xs">
                      {card.tags.map((tag: string, i: number) => (
                           <TagBadge key={i} tag={tag} />
                      ))}
                  </div>
              )}
          </div>
        </div>
      )}

      <CardShell 
        className={cn(
          "mx-auto border-none shadow-[0_4px_30px_-8px_rgba(0,0,0,0.08)] rounded-[32px] md:rounded-[40px] bg-white overflow-hidden transition-all duration-300 ring-1 ring-slate-100",
          !previewMode && "hover:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]",
          "cursor-pointer"
        )}
        onClick={handleFlip}
        actionsTopLeft={actionsTopLeft.length > 0 ? actionsTopLeft : undefined}
        actionsTopRight={actionsTopRight.length > 0 ? actionsTopRight : undefined}
        actionsBottomRight={actionsBottomRight.length > 0 ? actionsBottomRight : undefined}
        drawMode={enableDrawMode}
      >
        <div className="relative flex h-full flex-col px-2 md:px-3 pb-3 md:pb-4">

          {/* コンテンツエリア - 中央配置 */}
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-none mx-auto w-full py-8">
            {effectiveIsFlipped ? (
                /* 回答表示状態 */
                <div className="animate-in fade-in zoom-in-95 duration-300 w-full px-2">
                  {cardData.answerBlocks?.length > 0 ? (
                    <div className="w-full min-w-0">
                      {renderBlocks(cardData.answerBlocks)}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {answerText && (
                        <div className="w-full max-w-2xl mx-auto text-left">
                            <MathRenderer 
                            latex={answerText} 
                            displayMode="inline"
                            className="text-[clamp(1.125rem,4vw,1.5rem)] md:text-2xl font-medium text-slate-800 leading-relaxed font-serif break-all"
                            />
                        </div>
                      )}
                      
                      {answerCode?.code && (
                        <div className="mt-4 w-full max-w-2xl mx-auto text-left">
                            <CodeRenderer code={answerCode.code} language={answerCode.language} />
                        </div>
                      )}

                      <div className="mt-6 w-full">
                        <ImageGallery urls={answerImageUrls} onFullscreenChange={handleGalleryFullscreenChange} />
                      </div>
                      
                      <div className="mt-4 flex justify-center">
                        <AudioPlayer urls={answerAudios} />
                      </div>

                      {answerMemo && (
                        <div className="mt-6 p-4 bg-slate-50 rounded-2xl text-sm text-slate-600 text-left whitespace-pre-wrap break-all max-h-[300px] overflow-y-auto w-full border border-slate-100/50 max-w-2xl mx-auto">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Memo</div>
                            {answerMemo}
                        </div>
                      )}
                    </div>
                  )}
                </div>
            ) : (
                /* 質問表示状態 */
                <div className="animate-in fade-in zoom-in-95 duration-300 w-full px-2">
                  <div className="space-y-4 w-full">
                    
                    {cardData.questionBlocks?.length > 0 ? (
                        <div className="w-full min-w-0">
                            {renderBlocks(cardData.questionBlocks)}
                        </div>
                    ) : (
                        <div className="space-y-4 min-w-0">
                            {questionText && (
                                <div className="w-full max-w-2xl mx-auto text-left">
                                    <MathRenderer 
                                        latex={questionText} 
                                        displayMode="inline"
                                        className="text-[clamp(1.125rem,4vw,1.825rem)] md:text-3xl font-bold text-slate-800 leading-tight tracking-tight font-serif break-all"
                                    />
                                </div>
                            )}
                            
                            {questionCode?.code && (
                                <div className="mt-4 w-full max-w-2xl mx-auto text-left">
                                    <CodeRenderer code={questionCode.code} language={questionCode.language} />
                                </div>
                            )}

                            <div className="mt-6 w-full">
                                <ImageGallery urls={questionImageUrls} onFullscreenChange={handleGalleryFullscreenChange} />
                            </div>
                            
                            <div className="mt-4 flex justify-center">
                                <AudioPlayer urls={questionAudios} />
                            </div>

                            {questionMemo && (
                                <div className="mt-6 p-4 bg-slate-50 rounded-2xl text-sm text-slate-600 text-left whitespace-pre-wrap break-all max-h-[300px] overflow-y-auto w-full border border-slate-100/50 max-w-2xl mx-auto">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Memo</div>
                                    {questionMemo}
                                </div>
                            )}
                        </div>
                    )}
                  </div>
                </div>
            )}
          </div>

          {/* フッターエリア */}
          <div className="mt-auto pt-4 text-center">
             {extraFooter}
             {previewMode && (
                <div className="flex gap-4 justify-center">
                    {/* ボタン削除 */}
                </div>
             )}
          </div>
          
        </div>
      </CardShell>

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

      {/* ナビゲーション（オプション） */}
      {(onNext || onPrev || (currentIndex !== undefined && totalCards !== undefined)) && (
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
