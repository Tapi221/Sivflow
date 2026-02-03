import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent } from '@/Components/ui/card';
import { ChevronLeft, ChevronRight, HelpCircle, Pencil, RotateCcw, Volume2, Play, Pause, Bookmark, Tag } from 'lucide-react';
import MathRenderer from '@/Components/math/MathRender';
import { cn } from '@/lib/utils';
import { CodeRenderer } from './CodeRenderer';
import { AudioPlayer, ImageGallery } from './CardMedia';
import { useTags } from '@/hooks/useTags';

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
  isFlipped = false,
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
  previewMode = false,
  extraHeaderLeft,
  extraHeaderRight,
  extraFooter
}: FlashcardProps) {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

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

  const hasQuestionContent = questionText || questionImageUrls.length > 0 || questionAudios.length > 0 || questionCode?.code;
  const hasAnswerContent = answerText || answerImageUrls.length > 0 || answerAudios.length > 0 || answerCode?.code;

  const handleFlip = (e?: React.MouseEvent) => {
    if (isImageModalOpen) return;
    if (onFlip) {
        e?.stopPropagation();
        onFlip();
    }
  };

  const handleGalleryFullscreenChange = (isFullscreen: boolean) => {
      setIsImageModalOpen(isFullscreen);
  };

  if (!card) return <div className="text-center py-12 text-gray-500">No Card Data</div>;

  return (
    <div className={cn("w-full h-full flex flex-col", className)}>
      <Card 
        className={cn(
          "min-h-[450px] md:min-h-[600px] border-none shadow-[0_4px_30px_-8px_rgba(0,0,0,0.08)] rounded-[32px] md:rounded-[40px] bg-white flex flex-col relative overflow-hidden transition-all duration-300 ring-1 ring-slate-100",
          !previewMode && "cursor-pointer hover:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]"
        )}
        onClick={!previewMode ? handleFlip : undefined}
      >
        <CardContent className="p-6 md:p-10 flex-1 flex flex-col relative">
          
          {/* 左上：曖昧・編集・ブックマークボタン */}
          <div className="absolute top-6 md:top-8 left-6 md:top-8 md:left-8 flex gap-2 md:gap-3 z-10">
             {extraHeaderLeft}
             <Button
                variant={hasUncertainty ? "default" : "ghost"}
                size="icon"
                onClick={(e) => {
                    e.stopPropagation();
                    if(onToggleUncertainty) onToggleUncertainty(card);
                }}
                className={cn(
                    "rounded-full w-10 h-10 md:w-12 md:h-12 transition-colors",
                    hasUncertainty 
                        ? "bg-amber-400 hover:bg-amber-500 text-white shadow-md border-none" 
                        : "bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-transparent"
                )}
                title="曖昧/要復習"
             >
                <HelpCircle className="w-5 h-5 md:w-5 md:h-5 scale-90 md:scale-100" />
             </Button>

             <Button
                variant={isBookmarked ? "default" : "ghost"}
                size="icon"
                onClick={(e) => {
                    e.stopPropagation();
                    if(onToggleBookmark) onToggleBookmark(card);
                }}
                className={cn(
                    "rounded-full w-10 h-10 md:w-12 md:h-12 transition-colors",
                    isBookmarked 
                        ? "bg-primary-600 hover:bg-primary-700 text-white shadow-md border-none" 
                        : "bg-slate-50 text-slate-400 hover:bg-primary-600/10 hover:text-primary-600 border border-transparent"
                )}
                title="ブックマーク"
             >
                <Bookmark className={cn("w-5 h-5 md:w-5 md:h-5 scale-90 md:scale-100", isBookmarked && "fill-current")} />
             </Button>

             {!previewMode && onEdit && (
                 <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(card);
                    }}
                    className="rounded-full w-10 h-10 md:w-12 md:h-12 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    title="編集"
                >
                    <Pencil className="w-5 h-5 md:w-5 md:h-5 scale-90 md:scale-100" />
                </Button>
             )}
          </div>
          
          {/* 右上：タグ & 表面へ戻る & 追加要素 */}
          <div className="absolute top-6 md:top-8 right-6 md:right-8 z-10 flex flex-col items-end gap-2">
             {extraHeaderRight}
            {isFlipped && (
                <Button 
                    variant="ghost" 
                    className="text-[10px] font-bold tracking-widest text-slate-300 hover:text-slate-500 uppercase flex items-center gap-2 mb-2"
                    onClick={handleFlip}
                >
                    <RotateCcw className="w-3 h-3" />
                    Back to Question
                </Button>
            )}
            
            {/* タグ表示 */}
            {card?.tags && card.tags.length > 0 && (
                <div className="flex flex-wrap justify-end gap-2 animate-in fade-in slide-in-from-right-2 duration-500 delay-150 max-w-[300px]">
                    {card.tags.map((tag: string, i: number) => (
                         <TagBadge key={i} tag={tag} />
                    ))}
                </div>
            )}
          </div>

          {/* コンテンツエリア - 中央配置 */}
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto w-full py-12">
            
            {/* 回答表示状態 */}
            {isFlipped ? (
                <div className="animate-in fade-in zoom-in-95 duration-300 w-full">
                  <Badge variant="outline" className="mb-6 border-primary-600 text-primary-600 bg-primary-600/5 px-4 py-1.5 rounded-full mx-auto w-fit block">
                    ANSWER
                  </Badge>
                  
                  {answerText && (
                    <MathRenderer 
                      content={answerText} 
                      className="text-[clamp(1.125rem,4vw,1.5rem)] md:text-2xl font-medium text-slate-800 leading-relaxed font-serif"
                    />
                  )}
                  
                  {answerCode?.code && (
                    <div className="mt-6 w-full text-left">
                        <CodeRenderer code={answerCode.code} language={answerCode.language} />
                    </div>
                  )}

                  <div className="mt-8 w-full">
                     <ImageGallery urls={answerImageUrls} onFullscreenChange={handleGalleryFullscreenChange} />
                  </div>
                  
                  <div className="mt-4 flex justify-center">
                     <AudioPlayer urls={answerAudios} />
                  </div>

                  {answerMemo && (
                    <div className="mt-8 p-4 bg-slate-50 rounded-2xl text-sm text-slate-600 text-left whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto w-full border border-slate-100/50">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Memo</div>
                        {answerMemo}
                    </div>
                  )}
                </div>
            ) : (
                /* 問題表示状態 */
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
                  {questionText ? (
                    <MathRenderer 
                      content={questionText} 
                      className="text-[clamp(1.125rem,4vw,1.5rem)] md:text-2xl font-medium text-slate-700 leading-relaxed font-serif"
                    />
                  ) : (
                    !hasQuestionContent && <span className="text-slate-300 italic">No question content</span>
                  )}
                  
                  {questionCode?.code && (
                    <div className="mt-6 w-full text-left">
                        <CodeRenderer code={questionCode.code} language={questionCode.language} />
                    </div>
                  )}

                  <div className="mt-8 w-full">
                     <ImageGallery urls={questionImageUrls} onFullscreenChange={handleGalleryFullscreenChange} />
                  </div>
                  
                  <div className="mt-4 flex justify-center">
                      <AudioPlayer urls={questionAudios} />
                  </div>

                  {questionMemo && (
                    <div className="mt-8 p-4 bg-slate-50 rounded-2xl text-sm text-slate-600 text-left whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto w-full border border-slate-100/50">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Memo</div>
                        {questionMemo}
                    </div>
                  )}
                </div>
            )}
          </div>
          
          {/* フッターエリア */}
          <div className="mt-auto pt-8 border-t border-slate-50 text-center">
             {extraFooter}
             {!isFlipped && !previewMode && (
                 <p className="text-sm text-slate-400 animate-pulse">Click card to reveal answer</p>
             )}
             {previewMode && (
                <div className="flex gap-4 justify-center">
                    <Button variant="outline" size="sm" onClick={handleFlip}>
                        {isFlipped ? "問題を表示" : "答えを表示"}
                    </Button>
                </div>
             )}
          </div>

        </CardContent>
      </Card>

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
