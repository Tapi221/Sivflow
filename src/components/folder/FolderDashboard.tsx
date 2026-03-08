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
import { extractTextFromBlocks } from "@/utils";
import { calculateResistanceScore } from "@/utils/reviewMetrics";
import type { Card } from "@/types";
import { ChevronLeft, ChevronRight } from "@/ui/icons";

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
    text = answerText && answerText !== questionText ? answerText : "";
  }

  if (!text) return "";
  return text.length > 80 ? `${text.slice(0, 80)}...` : text;
};

// ── Section header ────────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
}

function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 6,
        borderBottom: "1px solid var(--section-divider, #ebebeb)",
        marginBottom: 0,
      }}
    >
      <span
        style={{
          fontSize: "var(--font-size-section, 13px)",
          fontWeight: 500,
          color: "var(--section-header-color, #6b6b6b)",
          letterSpacing: "0.01em",
        }}
      >
        {title}
      </span>
      {action}
    </div>
  );
}

// ── Properties panel ──────────────────────────────────────────────────────────
interface PropertyRowProps {
  label: string;
  value: ReactNode;
}

function PropertyRow({ label, value }: PropertyRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        padding: "4px 0",
        borderBottom: "1px solid var(--section-divider, #ebebeb)",
      }}
    >
      <span
        style={{
          width: 88,
          flexShrink: 0,
          fontSize: "var(--font-size-meta, 12px)",
          color: "var(--property-label-color, #8a8a8a)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "var(--font-size-body, 13px)",
          color: "var(--property-value-color, #1a1a1a)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
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

  const dueToday = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return activeCards.filter((card) => {
      const next = toDate(
        card.nextReviewDate ?? (card as unknown).next_review_date,
      );
      return next && next <= today;
    }).length;
  }, [activeCards]);

  const unlearned = useMemo(() => {
    return activeCards.filter((card) => {
      const reviewCount = card.reviewCount ?? (card as unknown).review_count ?? 0;
      return reviewCount === 0;
    }).length;
  }, [activeCards]);

  const lastReviewedDate = useMemo(() => {
    let latest: Date | null = null;
    for (const card of reviewedCards) {
      const d = toDate(card.lastReviewAt ?? (card as unknown).last_review_at);
      if (d && (!latest || d > latest)) latest = d;
    }
    return latest;
  }, [reviewedCards]);

  const hasMinimumReviewedCards = reviewedCards.length >= 1;

  const resilienceBuckets = useMemo(() => {
    const buckets = Array.from({ length: 20 }, (_, i) => {
      const min = i * 5;
      const max = min + 5;
      return { label: `${min}-${max}%`, min, count: 0 };
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
    if (min >= 80) return 0.9;
    if (min >= 60) return 0.75;
    if (min >= 40) return 0.6;
    if (min >= 20) return 0.44;
    return 0.32;
  };

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        background: "#ffffff",
      }}
    >
      {/* ── Page header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          height: 48,
          borderBottom: "1px solid var(--pane-border, #e8e8e8)",
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            fontSize: "var(--font-size-page-title, 22px)",
            fontWeight: 600,
            color: "var(--text-primary, #1a1a1a)",
            letterSpacing: "-0.015em",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {folderName || folderId}
        </h1>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <ToolbarButton onClick={handlers.onStartStudy} primary>
            学習する
          </ToolbarButton>
          <ToolbarButton onClick={handlers.onCreateCard}>作成</ToolbarButton>
          <ToolbarButton onClick={handlers.onViewCards}>カード一覧</ToolbarButton>
        </div>
      </div>

      {/* ── Main layout: content + properties ── */}
      <div
        style={{
          display: "flex",
          height: "calc(100% - 48px)",
          overflow: "hidden",
        }}
      >
        {/* ── Center content ── */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            padding: "20px 24px",
          }}
        >
          {/* Cards section */}
          <section style={{ marginBottom: 28 }}>
            <SectionHeader
              title="カード"
              action={
                <button
                  type="button"
                  onClick={handlers.onViewCards}
                  style={{
                    fontSize: "var(--font-size-meta, 12px)",
                    color: "var(--text-muted, #8a8a8a)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px 6px",
                    borderRadius: 3,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--hover-bg, rgba(0,0,0,0.04))";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "none";
                  }}
                >
                  すべて表示
                </button>
              }
            />
            <div style={{ marginTop: 12 }}>
              <CardScrollSection
                cards={sliderCards}
                onEmpty={<InlineEmptyState text="カードがまだありません" action="作成する" onAction={handlers.onCreateCard} />}
              />
            </div>
          </section>

          {/* Resilience distribution section */}
          <section>
            <SectionHeader title="定着度分布" />
            <div style={{ marginTop: 12 }}>
              {canShowDistribution ? (
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={resilienceBuckets}
                      margin={{ top: 4, right: 8, bottom: 16, left: 0 }}
                    >
                      <XAxis
                        dataKey="min"
                        tickLine={false}
                        axisLine={false}
                        fontSize={10}
                        stroke="var(--text-muted, #8a8a8a)"
                        tickFormatter={(v) =>
                          v % 20 === 0 || v === 0 ? `${v}%` : ""
                        }
                      />
                      <YAxis
                        domain={[0, maxBucketCount]}
                        tickLine={false}
                        axisLine={false}
                        fontSize={10}
                        stroke="var(--text-muted, #8a8a8a)"
                        width={24}
                        tickFormatter={(v) => (v === 0 ? "" : String(v))}
                      />
                      <Bar dataKey="count" radius={[2, 2, 0, 0]}>
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
                </div>
              ) : (
                <InlineEmptyState
                  text="復習するとここに定着度が表示されます"
                  action="学習を始める"
                  onAction={handlers.onStartStudy}
                />
              )}
            </div>
          </section>
        </div>

        {/* ── Right: Properties pane ── */}
        <aside
          style={{
            width: 200,
            flexShrink: 0,
            borderLeft: "1px solid var(--pane-border, #e8e8e8)",
            padding: "20px 16px",
            overflowY: "auto",
          }}
        >
          <p
            style={{
              fontSize: "var(--font-size-meta, 12px)",
              fontWeight: 500,
              color: "var(--section-header-color, #6b6b6b)",
              marginBottom: 8,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Properties
          </p>
          <PropertyRow label="カード数" value={activeCards.length} />
          <PropertyRow label="今日やる" value={dueToday} />
          <PropertyRow label="未学習" value={unlearned} />
          <PropertyRow label="学習済み" value={reviewedCards.length} />
          <PropertyRow
            label="最終復習"
            value={
              lastReviewedDate
                ? lastReviewedDate.toLocaleDateString("ja-JP", {
                    month: "short",
                    day: "numeric",
                  })
                : "—"
            }
          />
        </aside>
      </div>
    </div>
  );
}

// ── Toolbar button ────────────────────────────────────────────────────────────
interface ToolbarButtonProps {
  onClick: () => void;
  children: ReactNode;
  primary?: boolean;
}

function ToolbarButton({ onClick, children, primary }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: "var(--font-size-body, 13px)",
        fontWeight: primary ? 500 : 400,
        color: primary
          ? "var(--sidebar-active-accent, #7aa6a1)"
          : "var(--text-secondary, #4b4b4b)",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "4px 8px",
        borderRadius: 4,
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "var(--toolbar-btn-hover, rgba(0,0,0,0.06))";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "none";
      }}
    >
      {children}
    </button>
  );
}

// ── Inline empty state ────────────────────────────────────────────────────────
interface InlineEmptyStateProps {
  text: string;
  action?: string;
  onAction?: () => void;
}

function InlineEmptyState({ text, action, onAction }: InlineEmptyStateProps) {
  return (
    <div
      style={{
        padding: "16px 0",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span
        style={{
          fontSize: "var(--font-size-body, 13px)",
          color: "var(--text-muted, #8a8a8a)",
        }}
      >
        {text}
      </span>
      {action && onAction ? (
        <button
          type="button"
          onClick={onAction}
          style={{
            fontSize: "var(--font-size-meta, 12px)",
            color: "var(--sidebar-active-accent, #7aa6a1)",
            background: "none",
            border: "1px solid currentColor",
            borderRadius: 3,
            padding: "2px 8px",
            cursor: "pointer",
            opacity: 0.85,
          }}
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}

// ── Card scroll section ───────────────────────────────────────────────────────
const CARD_SCROLL_AMOUNT = 264;

interface CardScrollSectionProps {
  cards: Card[];
  onEmpty: ReactNode;
}

function CardScrollSection({ cards, onEmpty }: CardScrollSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
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

  const scrollBy = useCallback((dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "right" ? CARD_SCROLL_AMOUNT : -CARD_SCROLL_AMOUNT,
      behavior: "smooth",
    });
  }, []);

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

  if (cards.length === 0) return <>{onEmpty}</>;

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={scrollRef}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-label="カード一覧（横スクロール）"
        style={
          {
            overflowX: "auto",
            overscrollBehaviorX: "contain",
            outline: "none",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            paddingRight: 48,
          } as CSSProperties
        }
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            width: "max-content",
            paddingBottom: 4,
          }}
        >
          {cards.map((card) => {
            const isDraft = card.isDraft ?? (card as unknown).is_draft;
            const nextReview = toDate(
              card.nextReviewDate ?? (card as unknown).next_review_date,
            );
            const reviewText = nextReview
              ? nextReview.toLocaleDateString("ja-JP", {
                  month: "short",
                  day: "numeric",
                })
              : null;
            const title = displayTitle(card);
            const snippet = previewSnippet(card, title);

            return (
              <article
                key={card.id}
                style={{
                  flexShrink: 0,
                  width: 200,
                  border: "1px solid var(--pane-border, #e8e8e8)",
                  borderRadius: 4,
                  padding: "10px 12px",
                  background: "#fafafa",
                  transition: "border-color 0.15s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--sidebar-active-accent, #7aa6a1)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--pane-border, #e8e8e8)";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 6,
                  }}
                >
                  <h4
                    style={{
                      fontSize: "var(--font-size-body, 13px)",
                      fontWeight: 500,
                      color: "var(--text-primary, #1a1a1a)",
                      lineHeight: 1.4,
                      margin: 0,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {title}
                  </h4>
                  {isDraft ? (
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 10,
                        color: "var(--text-muted, #8a8a8a)",
                        border: "1px solid var(--section-divider, #ebebeb)",
                        borderRadius: 2,
                        padding: "0 4px",
                        lineHeight: "16px",
                      }}
                    >
                      下書き
                    </span>
                  ) : null}
                </div>
                {snippet ? (
                  <p
                    style={{
                      fontSize: "var(--font-size-meta, 12px)",
                      color: "var(--text-muted, #8a8a8a)",
                      lineHeight: 1.5,
                      marginTop: 6,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {snippet}
                  </p>
                ) : null}
                {reviewText ? (
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--text-placeholder, #b0b0b0)",
                      marginTop: 8,
                    }}
                  >
                    次回 {reviewText}
                  </p>
                ) : null}
              </article>
            );
          })}
          <div style={{ flexShrink: 0, width: 8 }} aria-hidden="true" />
        </div>
      </div>

      {/* Left fade */}
      <div
        aria-hidden="true"
        style={{
          pointerEvents: "none",
          position: "absolute",
          left: 0,
          top: 0,
          height: "100%",
          width: 40,
          background: "linear-gradient(to right, #fff 0%, transparent 100%)",
          opacity: canScrollLeft ? 1 : 0,
          transition: "opacity 0.2s",
        }}
      />

      {/* Right fade */}
      <div
        aria-hidden="true"
        style={{
          pointerEvents: "none",
          position: "absolute",
          right: 0,
          top: 0,
          height: "100%",
          width: 48,
          background: "linear-gradient(to left, #fff 0%, transparent 100%)",
          opacity: canScrollRight ? 1 : 0,
          transition: "opacity 0.2s",
        }}
      />

      {canScrollLeft && (
        <ScrollArrow dir="left" onClick={() => scrollBy("left")} />
      )}
      {canScrollRight && (
        <ScrollArrow dir="right" onClick={() => scrollBy("right")} />
      )}
    </div>
  );
}

function ScrollArrow({
  dir,
  onClick,
}: {
  dir: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "left" ? "左にスクロール" : "右にスクロール"}
      style={{
        position: "absolute",
        [dir]: 2,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: "#fff",
        border: "1px solid var(--pane-border, #e8e8e8)",
        color: "var(--text-secondary, #4b4b4b)",
        cursor: "pointer",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      {dir === "left" ? (
        <ChevronLeft style={{ width: 12, height: 12 }} />
      ) : (
        <ChevronRight style={{ width: 12, height: 12 }} />
      )}
    </button>
  );
}
