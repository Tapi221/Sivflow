import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { extractTextFromBlocks } from "@/utils";
import { calculateResistanceScore } from "@/utils/reviewMetrics";
import type { Card } from "@/types";
import { ChevronLeft, ChevronRight } from "@/ui/icons";
import { getPageRuledBg } from "@/components/card/frame/ruledStyles";

type FolderDashboardHandlers = {
  onStartStudy: () => void;
  onViewCards: () => void;
  onCreateCard: () => void;
};

interface FolderDashboardProps {
  folderId: string;
  folderName: string;
  cards: Card[];
  handlers: FolderDashboardHandlers;
}

const toDate = (value: unknown): Date | null => {
  if (value === null || value === undefined) return null;
  if (typeof (value as { toDate?: () => unknown })?.toDate === "function") {
    const d = (value as { toDate: () => unknown }).toDate();
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
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
  return "";
};

const normalizeInlineText = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const displayTitle = (card: Card): string => {
  const title = card.title?.trim();
  if (title) return title;
  const preview = normalizeInlineText(getPreviewText(card));
  if (preview) return preview.slice(0, 28);
  return "無題のカード";
};

const previewSnippet = (card: Card, headingText: string): string => {
  const questionText = normalizeInlineText(
    extractTextFromBlocks(card.questionBlocks ?? []) || card.questionText || "",
  );
  const answerText = normalizeInlineText(
    extractTextFromBlocks(card.answerBlocks ?? []) || card.answerText || "",
  );
  const heading = normalizeInlineText(headingText);

  let text = questionText || answerText;
  if (!text) return "";

  const isDuplicatedWithHeading =
    text === heading || text.startsWith(heading) || heading.startsWith(text);

  if (isDuplicatedWithHeading) {
    // 見出しと本文の二重表示を避ける。代替本文がない場合は本文を出さない。
    text = answerText && answerText !== questionText ? answerText : "";
  }

  if (!text) return "";
  return text.length > 92 ? `${text.slice(0, 92)}...` : text;
};

export function FolderDashboard({
  folderId,
  folderName,
  cards,
  handlers,
}: FolderDashboardProps) {
  const activeCards = useMemo(() => {
    return cards.filter((c) => !(c.isDeleted ?? (c as unknown).is_deleted));
  }, [cards]);

  const sliderCards = useMemo(() => {
    return [...activeCards]
      .sort(
        (a, b) =>
          (a.orderIndex ?? (a as unknown).order_index ?? 0) -
          (b.orderIndex ?? (b as unknown).order_index ?? 0),
      )
      .slice(0, 24);
  }, [activeCards]);

  const reviewedCards = useMemo(() => {
    return activeCards.filter((card) => {
      const reviewCount = card.reviewCount ?? (card as unknown).review_count ?? 0;
      const lastReview = toDate(
        card.lastReviewAt ?? (card as unknown).last_review_at,
      );
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
      const lastReview = toDate(
        card.lastReviewAt ?? (card as unknown).last_review_at,
      );
      const nextReview = toDate(
        card.nextReviewDate ?? (card as unknown).next_review_date,
      );
      let intervalDays = 0;

      if (lastReview && nextReview && nextReview > lastReview) {
        intervalDays =
          (nextReview.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24);
      }

      const score = Math.max(
        0,
        Math.min(100, calculateResistanceScore(intervalDays)),
      );
      const bucketIndex = Math.min(19, Math.floor(score / 5));
      buckets[bucketIndex].count += 1;
    });

    return buckets;
  }, [reviewedCards]);

  const hasResilienceData = useMemo(
    () => resilienceBuckets.some((bucket) => bucket.count > 0),
    [resilienceBuckets],
  );
  const canShowDistribution = hasMinimumReviewedCards && hasResilienceData;

  const maxBucketCount = useMemo(() => {
    const maxCount = Math.max(
      ...resilienceBuckets.map((bucket) => bucket.count),
      0,
    );
    return maxCount === 0 ? 1 : maxCount;
  }, [resilienceBuckets]);

  const getDistributionOpacity = (min: number) => {
    if (min >= 80) return 0.92;
    if (min >= 60) return 0.8;
    if (min >= 40) return 0.66;
    if (min >= 20) return 0.5;
    return 0.38;
  };

  const cardClass =
    "rounded-2xl border border-[var(--surface-border)] p-4 bg-[var(--sidebar-bg)] surface-concave";

  return (
    <div className="relative h-full overflow-y-auto">
      <div
        className="pointer-events-none absolute inset-0"
        style={getPageRuledBg("rgba(15,23,42,0.035)")}
      />
      <div className="relative z-[1] max-w-[1120px] mx-auto w-full px-4 pt-2 pb-6 space-y-4">
        <div className="flex flex-col gap-2">
          <div>
            <p className="h-[var(--app-row-px)] text-[12px] leading-[var(--app-row-px)] text-slate-400 font-bold tracking-[0.08em] uppercase">
              Folder Dashboard
            </p>
            <h2 className="text-[length:var(--app-row-px)] font-semibold text-slate-900 tracking-[-0.01em] leading-[var(--app-row-px)]">
              {folderName || folderId}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handlers.onStartStudy}
            className="h-8 px-4 text-xs font-semibold"
          >
            学習開始
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handlers.onViewCards}
            className="h-8 px-4 text-xs"
          >
            閲覧
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handlers.onCreateCard}
            className="h-8 px-4 text-xs"
          >
            カード作成
          </Button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 items-stretch">
            <section className={cardClass}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="h-[var(--app-row-px)] text-[12px] leading-[var(--app-row-px)] font-semibold tracking-[0.08em] text-[var(--sidebar-text-muted)] uppercase">
                    カード一覧
                  </h3>
                  <p className="text-xs text-[var(--sidebar-text-muted)] mt-1">
                    横にスワイプして確認
                  </p>
                </div>
                <div className="shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handlers.onViewCards}
                    className="h-8 px-3 text-xs"
                  >
                    すべて開く
                  </Button>
                </div>
              </div>

              <CardScrollSection
                cards={sliderCards}
                onEmpty={
                  <EmptyState
                    title="カードがありません"
                    description="新規カードを作成するとここに表示されます"
                    className="py-3"
                  />
                }
              />
            </section>
          </div>

          <section className={cardClass}>
            <div className="min-w-0">
              <h3 className="h-[var(--app-row-px)] text-[12px] leading-[var(--app-row-px)] font-semibold tracking-[0.08em] text-[var(--sidebar-text-muted)] uppercase">
                耐性スコア分布
              </h3>
              <p className="text-xs text-[var(--sidebar-text-muted)] mt-1">
                学習の定着度をざっくり可視化
              </p>
            </div>

            <div className="h-[340px] mt-3 rounded-2xl bg-[var(--sidebar-bg)] border border-[var(--surface-border)] surface-concave px-3 py-4">
              {canShowDistribution ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={resilienceBuckets}
                    margin={{ top: 18, right: 16, bottom: 20, left: 4 }}
                  >
                    <XAxis
                      dataKey="min"
                      tickLine={false}
                      axisLine={false}
                      fontSize={10}
                      stroke="#94a3b8"
                      tickFormatter={(v) =>
                        v % 20 === 0 || v === 0 ? `${v}%` : ""
                      }
                    />
                    <YAxis
                      domain={[0, maxBucketCount]}
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      stroke="#94a3b8"
                      width={28}
                      tickFormatter={(v) => (v === 0 ? "" : String(v))}
                    />
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
                  description="カードを復習すると分布が表示されます"
                  action={
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handlers.onStartStudy}
                      className="h-8 px-4 text-xs"
                    >
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
  onEmpty: ReactNode;
}

function CardScrollSection({ cards, onEmpty }: CardScrollSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
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
    el.addEventListener("scroll", updateScrollState, { passive: true });
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
      el.removeEventListener("scroll", updateScrollState);
    };
  }, [cards, updateScrollState]);

  // 矢印クリックでスムーススクロール
  const scrollBy = useCallback((dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "right" ? CARD_SCROLL_AMOUNT : -CARD_SCROLL_AMOUNT,
      behavior: "smooth",
    });
  }, []);

  // キーボード左右矢印対応
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollBy("right");
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollBy("left");
      }
    },
    [scrollBy],
  );

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
        style={
          {
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          } as CSSProperties
        }
        aria-label="カード一覧（横スクロール）"
      >
        <div
          className="flex gap-3 snap-x snap-mandatory pb-2"
          style={{ width: "max-content" }}
        >
          {cards.map((card) => {
            const isDraft = card.isDraft ?? (card as unknown).is_draft;
            const nextReview = toDate(
              card.nextReviewDate ?? (card as unknown).next_review_date,
            );
            const reviewText = nextReview
              ? nextReview.toLocaleDateString("ja-JP")
              : "未設定";
            const title = displayTitle(card);
            const snippet = previewSnippet(card, title);

            return (
              <article
                key={card.id}
                className="snap-start shrink-0 w-[240px] md:w-[260px] rounded-xl border border-[var(--surface-border)] bg-white surface-convex p-3 transition-shadow duration-150 hover:shadow-[0_2px_10px_rgba(86,72,74,0.2)]"
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
                  <p className="mt-2 text-xs leading-5 text-slate-500 line-clamp-3">
                    {snippet}
                  </p>
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
          background:
            "linear-gradient(to right, rgb(255,255,255) 0%, transparent 100%)",
          opacity: canScrollLeft ? 1 : 0,
        }}
      />

      {/* 右フェード: 続きがあることを示す（常にレンダリング、opacityで制御） */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-full w-20 transition-opacity duration-200"
        style={{
          background:
            "linear-gradient(to left, rgb(255,255,255) 10%, transparent 100%)",
          opacity: canScrollRight ? 1 : 0,
        }}
      />

      {/* 左矢印ボタン（スクロール可能時のみ表示） */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy("left")}
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
          onClick={() => scrollBy("right")}
          aria-label="右にスクロール"
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-primary-600 hover:border-primary-300 active:scale-95 transition-all duration-150"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
