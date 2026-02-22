import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Cell } from 'recharts';
import { Button } from '@/Components/ui/button';
import { CardHeader } from '@/Components/ui/CardHeader';
import { EmptyState } from '@/Components/ui/EmptyState';
import { extractTextFromBlocks } from '@/utils';
import { formatLastAccess } from '@/utils/dateUtils';
import { calculateResistanceScore } from '@/utils/reviewMetrics';
import type { Card } from '@/types';
import { Calendar, FileText, History, Star, ChevronLeft, ChevronRight } from 'lucide-react';


type FolderStats = {
  dueCount: number;
  unlearnedCount: number;
  lastReviewedAt?: Date | string | null;
};

type FolderDashboardHandlers = {
  onStartStudy: () => void;
  onViewCards: () => void;
  onCreateCard: () => void;
  onBulkCreate: () => void;
};

interface FolderDashboardProps {
  folderId: string;
  folderName: string;
  cards: Card[];
  stats: FolderStats;
  handlers: FolderDashboardHandlers;
}

const toDate = (value: unknown): Date | null => {
  if (value === null || value === undefined) return null;
  if (typeof (value as { toDate?: () => unknown })?.toDate === 'function') {
    const d = (value as { toDate: () => unknown }).toDate();
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const getPreviewText = (card: Card): string => {
  const q = extractTextFromBlocks(card.questionBlocks ?? []);
  if (q) return q;
  const a = extractTextFromBlocks(card.answerBlocks ?? []);
  if (a) return a;
  if (card.questionText) return card.questionText;
  if (card.answerText) return card.answerText;
  return '';
};

const normalizeInlineText = (value: string): string => value.replace(/\s+/g, ' ').trim();

const displayTitle = (card: Card): string => {
  const title = card.title?.trim();
  if (title) return title;
  const preview = normalizeInlineText(getPreviewText(card));
  if (preview) return preview.slice(0, 28);
  return '無題のカード';
};

const previewSnippet = (card: Card, headingText: string): string => {
  const questionText = normalizeInlineText(extractTextFromBlocks(card.questionBlocks ?? []) || card.questionText || '');
  const answerText = normalizeInlineText(extractTextFromBlocks(card.answerBlocks ?? []) || card.answerText || '');
  const heading = normalizeInlineText(headingText);

  let text = questionText || answerText;
  if (!text) return '';

  const isDuplicatedWithHeading =
    text === heading || text.startsWith(heading) || heading.startsWith(text);

  if (isDuplicatedWithHeading) {
    // 見出しと本文の二重表示を避ける。代替本文がない場合は本文を出さない。
    text = answerText && answerText !== questionText ? answerText : '';
  }

  if (!text) return '';
  return text.length > 92 ? `${text.slice(0, 92)}...` : text;
};

const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const plusDays = (base: Date, days: number): Date => {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
};

const isWithinRange = (value: Date | null, start: Date, end: Date): boolean => {
  if (!value) return false;
  return value >= start && value < end;
};

export function FolderDashboard({
  folderId,
  folderName,
  cards,
  stats,
  handlers,
}: FolderDashboardProps) {
  const lastReviewedText = useMemo(() => {
    const d = toDate(stats.lastReviewedAt);
    if (!d) return '未学習';
    const formatted = formatLastAccess(d);
    return formatted?.text || d.toLocaleDateString('ja-JP');
  }, [stats.lastReviewedAt]);

  const todayStart = useMemo(() => startOfToday(), []);
  const tomorrowStart = useMemo(() => plusDays(todayStart, 1), [todayStart]);

  const activeCards = useMemo(() => {
    return cards.filter((c) => !(c.isDeleted ?? (c as any).is_deleted));
  }, [cards]);

  const completedToday = useMemo(() => {
    return activeCards.filter((card) => {
      const lastReview = toDate(card.lastReviewAt ?? (card as any).last_review_at);
      return isWithinRange(lastReview, todayStart, tomorrowStart);
    }).length;
  }, [activeCards, todayStart, tomorrowStart]);

  const todayPlanned = Math.max(0, (stats.dueCount ?? 0) + completedToday);
  const todayProgressPercent = todayPlanned > 0 ? Math.round((completedToday / todayPlanned) * 100) : 0;

  const sliderCards = useMemo(() => {
    return [...activeCards]
      .sort((a, b) => (a.orderIndex ?? (a as any).order_index ?? 0) - (b.orderIndex ?? (b as any).order_index ?? 0))
      .slice(0, 24);
  }, [activeCards]);

  const reviewedCards = useMemo(() => {
    return activeCards.filter((card) => {
      const reviewCount = card.reviewCount ?? (card as any).review_count ?? 0;
      const lastReview = toDate(card.lastReviewAt ?? (card as any).last_review_at);
      return reviewCount > 0 || !!lastReview;
    });
  }, [activeCards]);

  const hasMinimumReviewedCards = reviewedCards.length >= 1;

  const resilienceBuckets = useMemo(() => {
    const buckets = Array.from({ length: 20 }, (_, i) => {
      const min = i * 5;
      const max = min + 5;
      return {
        label: `${min}-${max}%`,
        min,
        count: 0,
      };
    });

    reviewedCards.forEach((card) => {
      const lastReview = toDate(card.lastReviewAt ?? (card as any).last_review_at);
      const nextReview = toDate(card.nextReviewDate ?? (card as any).next_review_date);
      let intervalDays = 0;

      if (lastReview && nextReview && nextReview > lastReview) {
        intervalDays = (nextReview.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24);
      }

      const score = Math.max(0, Math.min(100, calculateResistanceScore(intervalDays)));
      const bucketIndex = Math.min(19, Math.floor(score / 5));
      buckets[bucketIndex].count += 1;
    });

    return buckets;
  }, [reviewedCards]);

  const hasResilienceData = useMemo(
    () => resilienceBuckets.some((bucket) => bucket.count > 0),
    [resilienceBuckets]
  );
  const canShowDistribution = hasMinimumReviewedCards && hasResilienceData;

  const maxBucketCount = useMemo(() => {
    const maxCount = Math.max(...resilienceBuckets.map((bucket) => bucket.count), 0);
    return maxCount === 0 ? 1 : maxCount;
  }, [resilienceBuckets]);

  const getDistributionOpacity = (min: number) => {
    if (min >= 80) return 0.92;
    if (min >= 60) return 0.8;
    if (min >= 40) return 0.66;
    if (min >= 20) return 0.5;
    return 0.38;
  };

  const cardClass = 'rounded-xl border border-slate-200 p-4 bg-white shadow-none';

  return (
    <div className="relative h-full overflow-y-auto font-serif">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(15,23,42,0.035) 0px, rgba(15,23,42,0.035) 1px, transparent 1px, transparent 24px)',
          backgroundSize: '100% 24px',
        }}
      />
      <div className="relative z-[1] max-w-[1120px] mx-auto w-full px-4 py-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Folder Dashboard</p>
            <h2 className="text-[22px] md:text-[28px] font-semibold text-slate-900 tracking-[-0.01em] leading-[1.15] mt-1">
              {folderName || folderId}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 text-slate-500 bg-white shadow-none">
              <FileText size={11} className="text-slate-400" />
              <span className="text-[10px] font-medium">カード</span>
              <span className="text-xs font-bold text-slate-700">{cards.length}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 text-slate-500 bg-white shadow-none">
              <Calendar size={11} className="text-slate-400" />
              <span className="text-[10px] font-medium">今日やる</span>
              <span className="text-xs font-bold text-slate-700">{stats.dueCount ?? 0}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 text-slate-500 bg-white shadow-none">
              <Star size={11} className="text-slate-400" />
              <span className="text-[10px] font-medium">未学習</span>
              <span className="text-xs font-bold text-slate-700">{stats.unlearnedCount ?? 0}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 text-slate-500 bg-white shadow-none">
              <History size={11} className="text-slate-400" />
              <span className="text-[10px] font-medium">前回</span>
              <span className="text-[10px] font-bold text-slate-700 truncate max-w-[92px]">{lastReviewedText}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={handlers.onStartStudy} className="h-8 px-4 text-xs font-semibold">
            学習開始
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={handlers.onViewCards} className="h-8 px-4 text-xs">
            閲覧
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={handlers.onCreateCard} className="h-8 px-4 text-xs">
            新規カード
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={handlers.onBulkCreate} className="h-8 px-3 text-xs">
            一括作成
          </Button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_280px] gap-4 items-stretch">
            <section className={cardClass}>
              <CardHeader
                title="カード一覧"
                description="横にスワイプして確認"
                action={
                  <Button type="button" size="sm" variant="ghost" onClick={handlers.onViewCards} className="h-8 px-3 text-xs">
                    すべて開く
                  </Button>
                }
              />

              <CardScrollSection cards={sliderCards} onEmpty={
                <EmptyState
                  title="カードがありません"
                  description="新規カードを作成するとここに表示されます"
                  className="py-3"
                />
              } />
            </section>

            <section className={`${cardClass} md:aspect-square md:flex md:flex-col`}>
              <CardHeader
                title="今日の学習"
                description={`今日やる: ${todayPlanned} / 完了: ${completedToday}`}
              />

              <div className="mt-4 flex flex-col items-center gap-2 md:flex-1 md:justify-center">
                {(() => {
                  const progress = Math.max(0, Math.min(100, todayProgressPercent));
                  const radius = 46;
                  const circumference = 2 * Math.PI * radius;
                  const dashOffset = circumference * (1 - progress / 100);

                  return (
                    <div className="relative w-[120px] h-[120px] md:w-[132px] md:h-[132px]">
                      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" aria-hidden="true">
                        <circle
                          cx="60"
                          cy="60"
                          r={radius}
                          fill="none"
                          stroke="rgba(148,163,184,0.22)"
                          strokeWidth="10"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r={radius}
                          fill="none"
                          stroke="var(--color-primary-600-hex, #689A98)"
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={dashOffset}
                          className="transition-all duration-500 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl md:text-3xl font-bold text-slate-800 tabular-nums">{completedToday}</span>
                        <span className="text-[10px] font-semibold tracking-wide text-slate-400">完了</span>
                      </div>
                    </div>
                  );
                })()}
                <div className="text-[11px] text-slate-500">
                  {todayPlanned > 0 ? `${todayProgressPercent}% 完了` : '今日の予定はありません'}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3 md:mt-auto">
                {(stats.dueCount ?? 0) > 0 ? (
                  <Button type="button" size="sm" onClick={handlers.onStartStudy} className="h-8 px-4 text-xs">
                    復習を始める
                  </Button>
                ) : todayProgressPercent < 100 ? (
                  <Button type="button" size="sm" variant="secondary" onClick={handlers.onStartStudy} className="h-8 px-4 text-xs">
                    学習を進める
                  </Button>
                ) : null}
              </div>
            </section>
          </div>

          <section className={cardClass}>
            <CardHeader
              title="耐性スコア分布"
              description="学習の定着度をざっくり可視化"
            />

            <div className="h-[340px] mt-3 rounded-2xl bg-white border border-slate-200 px-3 py-4">
              {canShowDistribution ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resilienceBuckets} margin={{ top: 18, right: 16, bottom: 20, left: 4 }}>
                    <XAxis 
                      dataKey="min" 
                      tickLine={false} 
                      axisLine={false} 
                      fontSize={10} 
                      stroke="#94a3b8" 
                      tickFormatter={(v) => v % 20 === 0 || v === 0 ? `${v}%` : ''}
                    />
                    <YAxis domain={[0, maxBucketCount]} tickLine={false} axisLine={false} fontSize={11} stroke="#94a3b8" width={28} tickFormatter={(v) => v === 0 ? '' : String(v)} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {resilienceBuckets.map((bucket) => (
                        <Cell
                          key={bucket.label}
                          fill="var(--color-primary-600-hex, #689A98)"
                          fillOpacity={getDistributionOpacity(bucket.min)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  title="まだデータがありません"
                  description="1回以上学習すると分布が表示されます"
                  action={
                    <Button type="button" size="sm" variant="secondary" onClick={handlers.onStartStudy} className="h-8 px-4 text-xs">
                      学習を始める
                    </Button>
                  }
                />
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------
// カード一覧の横スクロールセクション
// 右端見切れ・フェードオーバーレイ・矢印ボタンを備えたカルーセルUI
// ----------------------------------------------------------
const CARD_SCROLL_AMOUNT = 264; // scrollByの量 (px)

interface CardScrollSectionProps {
  cards: Card[];
  onEmpty: React.ReactNode;
}

function CardScrollSection({ cards, onEmpty }: CardScrollSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft]   = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // スクロール状態を更新
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  // 初期表示・カード変化・リサイズ時に再判定
  useEffect(() => {
    // 描画完了後に判定する
    const id = requestAnimationFrame(updateScrollState);
    const el = scrollRef.current;
    if (!el) return () => cancelAnimationFrame(id);

    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    el.addEventListener('scroll', updateScrollState, { passive: true });
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
      el.removeEventListener('scroll', updateScrollState);
    };
  }, [cards, updateScrollState]);

  // 矢印クリックでスムーススクロール
  const scrollBy = useCallback((dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? CARD_SCROLL_AMOUNT : -CARD_SCROLL_AMOUNT, behavior: 'smooth' });
  }, []);

  // キーボード左右矢印対応
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollBy('right'); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); scrollBy('left');  }
  }, [scrollBy]);

  if (cards.length === 0) return <div className="mt-3">{onEmpty}</div>;

  return (
    // 外側ラッパー: relative にして矢印・フェードを重ねる
    <div className="relative mt-3 -mx-4 px-4">

      {/* スクロールコンテナ
          pr-16 で右端に余白を作り「最後のカードが見切れる」感を演出
          scrollbar は非表示にして見た目をクリーンに保つ */}
      <div
        ref={scrollRef}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        className="overflow-x-auto overscroll-x-contain outline-none focus-visible:ring-2 focus-visible:ring-primary-300 rounded-lg pr-16"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        aria-label="カード一覧（横スクロール）"
      >
        <div
          className="flex gap-3 snap-x snap-mandatory pb-2"
          style={{ width: 'max-content' }}
        >
          {cards.map((card) => {
            const isDraft = card.isDraft ?? (card as any).is_draft;
            const nextReview = toDate(card.nextReviewDate ?? (card as any).next_review_date);
            const reviewText = nextReview ? nextReview.toLocaleDateString('ja-JP') : '未設定';
            const title = displayTitle(card);
            const snippet = previewSnippet(card, title);

            return (
              <article
                key={card.id}
                className="snap-start shrink-0 w-[240px] md:w-[260px] rounded-xl border border-slate-200 bg-white p-3 shadow-[0_1px_8px_rgba(15,23,42,0.04)] hover:shadow-[0_2px_14px_rgba(15,23,42,0.08)] transition-shadow duration-150"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
                    {title}
                  </h4>
                  {isDraft ? (
                    <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                      下書き
                    </span>
                  ) : null}
                </div>
                {snippet ? (
                  <p className="mt-2 text-xs leading-5 text-slate-500 line-clamp-3">{snippet}</p>
                ) : null}
                <div className="mt-3 text-[10px] font-medium text-slate-400">
                  次回: <span className="text-slate-500">{reviewText}</span>
                </div>
              </article>
            );
          })}
          {/* 末尾の余白（フェード領域がカードに被らないように） */}
          <div className="shrink-0 w-4" aria-hidden="true" />
        </div>
      </div>

      {/* 左フェード: 戻れることを示す */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-full w-12 transition-opacity duration-200"
        style={{
          background: 'linear-gradient(to right, rgb(255,255,255) 0%, transparent 100%)',
          opacity: canScrollLeft ? 1 : 0,
        }}
      />

      {/* 右フェード: 続きがあることを示す（常にレンダリング、opacityで制御） */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-full w-20 transition-opacity duration-200"
        style={{
          background: 'linear-gradient(to left, rgb(255,255,255) 10%, transparent 100%)',
          opacity: canScrollRight ? 1 : 0,
        }}
      />

      {/* 左矢印ボタン（スクロール可能時のみ表示） */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy('left')}
          aria-label="左にスクロール"
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-primary-600 hover:border-primary-300 active:scale-95 transition-all duration-150"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      )}

      {/* 右矢印ボタン（スクロール可能時のみ表示） */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollBy('right')}
          aria-label="右にスクロール"
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-primary-600 hover:border-primary-300 active:scale-95 transition-all duration-150"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
