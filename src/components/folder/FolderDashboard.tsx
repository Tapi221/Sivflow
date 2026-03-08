import {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
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

// ── Types ──────────────────────────────────────────────────────────────────────

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
  onRenameFolder?: (newName: string) => Promise<void>;
}

type ViewMode = "carousel" | "table";
type SortKey = "order" | "title" | "nextReview" | "reviewCount";
type SortDir = "asc" | "desc";

// ── Utilities ──────────────────────────────────────────────────────────────────

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

// ── Design tokens (inline) ────────────────────────────────────────────────────

const T = {
  border: "var(--pane-border, #e8e8e8)",
  divider: "var(--section-divider, #ebebeb)",
  textPrimary: "var(--text-primary, #1a1a1a)",
  textSecondary: "var(--text-secondary, #4b4b4b)",
  textMuted: "var(--text-muted, #8a8a8a)",
  textPlaceholder: "var(--text-placeholder, #b0b0b0)",
  hoverBg: "var(--hover-bg, rgba(0,0,0,0.04))",
  activeBg: "var(--active-bg, rgba(104,154,152,0.1))",
  accent: "var(--sidebar-active-accent, #7aa6a1)",
  sectionLabel: "var(--section-header-color, #6b6b6b)",
  fsMeta: "var(--font-size-meta, 12px)",
  fsBody: "var(--font-size-body, 13px)",
  fsSection: "var(--font-size-section, 13px)",
  fsTitle: "var(--font-size-page-title, 22px)",
};

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 6,
        borderBottom: `1px solid ${T.divider}`,
      }}
    >
      <span
        style={{
          fontSize: T.fsSection,
          fontWeight: 500,
          color: T.sectionLabel,
          letterSpacing: "0.01em",
        }}
      >
        {title}
      </span>
      {action}
    </div>
  );
}

// ── Toolbar button ────────────────────────────────────────────────────────────

function ToolbarBtn({
  onClick,
  children,
  active,
  primary,
  title,
}: {
  onClick?: () => void;
  children: ReactNode;
  active?: boolean;
  primary?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        fontSize: T.fsBody,
        fontWeight: primary ? 500 : 400,
        color: active ? T.accent : primary ? T.accent : T.textSecondary,
        background: active ? T.activeBg : "none",
        border: "none",
        cursor: "pointer",
        padding: "3px 8px",
        borderRadius: 4,
        transition: "background 0.1s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!active)
          (e.currentTarget as HTMLElement).style.background =
            "var(--toolbar-btn-hover,rgba(0,0,0,0.06))";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = active ? T.activeBg : "none";
      }}
    >
      {children}
    </button>
  );
}

// ── Inline empty state ────────────────────────────────────────────────────────

function InlineEmpty({
  text,
  action,
  onAction,
}: {
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div style={{ padding: "14px 0", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: T.fsBody, color: T.textMuted }}>{text}</span>
      {action && onAction ? (
        <button
          type="button"
          onClick={onAction}
          style={{
            fontSize: T.fsMeta,
            color: T.accent,
            background: "none",
            border: `1px solid ${T.accent}`,
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

// ── Property row ──────────────────────────────────────────────────────────────

function PropertyRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        padding: "4px 0",
        borderBottom: `1px solid ${T.divider}`,
      }}
    >
      <span
        style={{
          width: 80,
          flexShrink: 0,
          fontSize: T.fsMeta,
          color: T.textMuted,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: T.fsBody,
          color: T.textPrimary,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Sort indicator ────────────────────────────────────────────────────────────

function SortIcon({ dir }: { dir: SortDir }) {
  return (
    <span style={{ fontSize: 10, marginLeft: 2, opacity: 0.7 }}>
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function FolderDashboard({
  folderId,
  folderName,
  cards,
  handlers,
  onRenameFolder,
}: FolderDashboardProps) {
  // ── View state ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("carousel");
  const [sortKey, setSortKey] = useState<SortKey>("order");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterDraftState, setFilterDraftState] = useState<
    "all" | "draft" | "published"
  >("all");
  const [filterReviewed, setFilterReviewed] = useState<
    "all" | "unlearned" | "reviewed"
  >("all");
  const [showFilterBar, setShowFilterBar] = useState(false);

  // ── Rename state ─────────────────────────────────────────────────────────────
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(folderName);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedName(folderName);
  }, [folderName]);

  const commitRename = useCallback(async () => {
    const trimmed = editedName.trim();
    if (!trimmed || trimmed === folderName) {
      setEditedName(folderName);
      setIsEditingName(false);
      return;
    }
    await onRenameFolder?.(trimmed);
    setIsEditingName(false);
  }, [editedName, folderName, onRenameFolder]);

  const startEditing = useCallback(() => {
    if (!onRenameFolder) return;
    setIsEditingName(true);
    requestAnimationFrame(() => nameInputRef.current?.select());
  }, [onRenameFolder]);

  // ── Derived card lists ───────────────────────────────────────────────────────
  const activeCards = useMemo(
    () => cards.filter((c) => !(c.isDeleted ?? (c as unknown).is_deleted)),
    [cards],
  );

  const reviewedCards = useMemo(
    () =>
      activeCards.filter((card) => {
        const reviewCount =
          card.reviewCount ?? (card as unknown).review_count ?? 0;
        const lastReview = toDate(
          card.lastReviewAt ?? (card as unknown).last_review_at,
        );
        return reviewCount > 0 || !!lastReview;
      }),
    [activeCards],
  );

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

  const unlearned = useMemo(
    () =>
      activeCards.filter(
        (card) =>
          (card.reviewCount ?? (card as unknown).review_count ?? 0) === 0,
      ).length,
    [activeCards],
  );

  const lastReviewedDate = useMemo(() => {
    let latest: Date | null = null;
    for (const card of reviewedCards) {
      const d = toDate(card.lastReviewAt ?? (card as unknown).last_review_at);
      if (d && (!latest || d > latest)) latest = d;
    }
    return latest;
  }, [reviewedCards]);

  // ── Filtered + sorted cards ──────────────────────────────────────────────────
  const displayCards = useMemo(() => {
    let list = [...activeCards];

    // draft filter
    if (filterDraftState === "draft") {
      list = list.filter(
        (c) => c.isDraft ?? (c as unknown).is_draft,
      );
    } else if (filterDraftState === "published") {
      list = list.filter(
        (c) => !(c.isDraft ?? (c as unknown).is_draft),
      );
    }

    // reviewed filter
    if (filterReviewed === "unlearned") {
      list = list.filter(
        (c) => (c.reviewCount ?? (c as unknown).review_count ?? 0) === 0,
      );
    } else if (filterReviewed === "reviewed") {
      list = list.filter(
        (c) => (c.reviewCount ?? (c as unknown).review_count ?? 0) > 0,
      );
    }

    // sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "order") {
        cmp =
          (a.orderIndex ?? (a as unknown).order_index ?? 0) -
          (b.orderIndex ?? (b as unknown).order_index ?? 0);
      } else if (sortKey === "title") {
        cmp = displayTitle(a).localeCompare(displayTitle(b), "ja");
      } else if (sortKey === "nextReview") {
        const da = toDate(
          a.nextReviewDate ?? (a as unknown).next_review_date,
        );
        const db = toDate(
          b.nextReviewDate ?? (b as unknown).next_review_date,
        );
        if (!da && !db) cmp = 0;
        else if (!da) cmp = 1;
        else if (!db) cmp = -1;
        else cmp = da.getTime() - db.getTime();
      } else if (sortKey === "reviewCount") {
        cmp =
          (a.reviewCount ?? (a as unknown).review_count ?? 0) -
          (b.reviewCount ?? (b as unknown).review_count ?? 0);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [activeCards, filterDraftState, filterReviewed, sortKey, sortDir]);

  const carouselCards = useMemo(
    () => displayCards.slice(0, 24),
    [displayCards],
  );

  // ── Resilience buckets ───────────────────────────────────────────────────────
  const resilienceBuckets = useMemo(() => {
    const buckets = Array.from({ length: 20 }, (_, i) => ({
      label: `${i * 5}-${i * 5 + 5}%`,
      min: i * 5,
      count: 0,
    }));
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
          (nextReview.getTime() - lastReview.getTime()) /
          (1000 * 60 * 60 * 24);
      }
      const score = Math.max(
        0,
        Math.min(100, calculateResistanceScore(intervalDays)),
      );
      buckets[Math.min(19, Math.floor(score / 5))].count += 1;
    });
    return buckets;
  }, [reviewedCards]);

  const maxBucketCount = useMemo(() => {
    const m = Math.max(...resilienceBuckets.map((b) => b.count), 0);
    return m === 0 ? 1 : m;
  }, [resilienceBuckets]);

  const canShowDistribution =
    reviewedCards.length >= 1 &&
    resilienceBuckets.some((b) => b.count > 0);

  const getDistributionOpacity = (min: number) => {
    if (min >= 80) return 0.9;
    if (min >= 60) return 0.75;
    if (min >= 40) return 0.6;
    if (min >= 20) return 0.44;
    return 0.32;
  };

  // ── Sort column handler ──────────────────────────────────────────────────────
  const handleSortColumn = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // ── Filter active ────────────────────────────────────────────────────────────
  const isFilterActive =
    filterDraftState !== "all" || filterReviewed !== "all";

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#ffffff" }}>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          height: 48,
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
          gap: 8,
        }}
      >
        {/* Folder name — editable */}
        {isEditingName ? (
          <input
            ref={nameInputRef}
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={() => { void commitRename(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { void commitRename(); }
              if (e.key === "Escape") {
                setEditedName(folderName);
                setIsEditingName(false);
              }
            }}
            style={{
              fontSize: T.fsTitle,
              fontWeight: 600,
              color: T.textPrimary,
              letterSpacing: "-0.015em",
              border: "none",
              borderBottom: `1.5px solid ${T.accent}`,
              background: "transparent",
              outline: "none",
              flex: 1,
              minWidth: 0,
              padding: "0 2px",
            }}
            autoFocus
          />
        ) : (
          <h1
            onClick={startEditing}
            title={onRenameFolder ? "クリックで編集" : undefined}
            style={{
              fontSize: T.fsTitle,
              fontWeight: 600,
              color: T.textPrimary,
              letterSpacing: "-0.015em",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              minWidth: 0,
              cursor: onRenameFolder ? "text" : "default",
            }}
          >
            {folderName || folderId}
          </h1>
        )}

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
          <ToolbarBtn onClick={handlers.onStartStudy} primary>
            学習する
          </ToolbarBtn>
          <Divider />
          <ToolbarBtn onClick={handlers.onCreateCard}>作成</ToolbarBtn>
          <ToolbarBtn onClick={handlers.onViewCards}>カード一覧</ToolbarBtn>
          <Divider />
          {/* View toggle */}
          <ToolbarBtn
            onClick={() => setViewMode("carousel")}
            active={viewMode === "carousel"}
            title="カルーセル表示"
          >
            ☷
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => setViewMode("table")}
            active={viewMode === "table"}
            title="テーブル表示"
          >
            ≡
          </ToolbarBtn>
          <Divider />
          {/* Filter toggle */}
          <ToolbarBtn
            onClick={() => setShowFilterBar((v) => !v)}
            active={showFilterBar || isFilterActive}
            title="フィルタ"
          >
            {isFilterActive ? "フィルタ中" : "フィルタ"}
          </ToolbarBtn>
        </div>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────────── */}
      {showFilterBar && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "6px 20px",
            borderBottom: `1px solid ${T.divider}`,
            background: "#fafafa",
            flexWrap: "wrap",
          }}
        >
          <FilterGroup label="状態">
            {(["all", "published", "draft"] as const).map((v) => (
              <FilterChip
                key={v}
                label={v === "all" ? "すべて" : v === "published" ? "完成" : "下書き"}
                active={filterDraftState === v}
                onClick={() => setFilterDraftState(v)}
              />
            ))}
          </FilterGroup>
          <FilterGroup label="学習">
            {(["all", "unlearned", "reviewed"] as const).map((v) => (
              <FilterChip
                key={v}
                label={
                  v === "all" ? "すべて" : v === "unlearned" ? "未学習" : "学習済み"
                }
                active={filterReviewed === v}
                onClick={() => setFilterReviewed(v)}
              />
            ))}
          </FilterGroup>
          <FilterGroup label="並び替え">
            {(
              [
                ["order", "順番"],
                ["title", "タイトル"],
                ["nextReview", "次回復習"],
                ["reviewCount", "学習回数"],
              ] as [SortKey, string][]
            ).map(([key, label]) => (
              <FilterChip
                key={key}
                label={
                  sortKey === key
                    ? `${label} ${sortDir === "asc" ? "↑" : "↓"}`
                    : label
                }
                active={sortKey === key}
                onClick={() => handleSortColumn(key)}
              />
            ))}
          </FilterGroup>
          {isFilterActive && (
            <button
              type="button"
              onClick={() => {
                setFilterDraftState("all");
                setFilterReviewed("all");
              }}
              style={{
                fontSize: T.fsMeta,
                color: T.textMuted,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: 3,
                marginLeft: "auto",
              }}
            >
              リセット
            </button>
          )}
        </div>
      )}

      {/* ── Main layout ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          height: showFilterBar ? "calc(100% - 48px - 36px)" : "calc(100% - 48px)",
          overflow: "hidden",
        }}
      >
        {/* ── Center content ──────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            padding: "18px 24px",
          }}
        >
          {/* Cards section */}
          <section style={{ marginBottom: 28 }}>
            <SectionHeader
              title={`カード${displayCards.length !== activeCards.length ? ` (${displayCards.length}/${activeCards.length})` : ""}`}
              action={
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {viewMode === "table" && (
                    <span style={{ fontSize: T.fsMeta, color: T.textMuted }}>
                      {displayCards.length} 件
                    </span>
                  )}
                  <ToolbarBtn onClick={handlers.onViewCards}>
                    すべて表示
                  </ToolbarBtn>
                </div>
              }
            />
            <div style={{ marginTop: 12 }}>
              {viewMode === "carousel" ? (
                <CardScrollSection
                  cards={carouselCards}
                  onEmpty={
                    <InlineEmpty
                      text="カードがまだありません"
                      action="作成する"
                      onAction={handlers.onCreateCard}
                    />
                  }
                />
              ) : (
                <CardTableSection
                  cards={displayCards}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSortColumn}
                  onEmpty={
                    <InlineEmpty
                      text="カードがまだありません"
                      action="作成する"
                      onAction={handlers.onCreateCard}
                    />
                  }
                />
              )}
            </div>
          </section>

          {/* Resilience distribution */}
          <section>
            <SectionHeader title="定着度分布" />
            <div style={{ marginTop: 12 }}>
              {canShowDistribution ? (
                <div style={{ height: 180 }}>
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
                        stroke={T.textMuted}
                        tickFormatter={(v) =>
                          v % 20 === 0 || v === 0 ? `${v}%` : ""
                        }
                      />
                      <YAxis
                        domain={[0, maxBucketCount]}
                        tickLine={false}
                        axisLine={false}
                        fontSize={10}
                        stroke={T.textMuted}
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
                <InlineEmpty
                  text="復習するとここに定着度が表示されます"
                  action="学習を始める"
                  onAction={handlers.onStartStudy}
                />
              )}
            </div>
          </section>
        </div>

        {/* ── Properties pane ─────────────────────────────────────────────── */}
        <aside
          style={{
            width: 196,
            flexShrink: 0,
            borderLeft: `1px solid ${T.border}`,
            padding: "18px 16px",
            overflowY: "auto",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: T.sectionLabel,
              marginBottom: 8,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Properties
          </p>

          {/* Editable folder name */}
          <div
            style={{
              padding: "4px 0",
              borderBottom: `1px solid ${T.divider}`,
              marginBottom: 0,
            }}
          >
            <span style={{ fontSize: T.fsMeta, color: T.textMuted, display: "block", marginBottom: 2 }}>
              フォルダ名
            </span>
            <EditablePropertyValue
              value={folderName}
              onCommit={onRenameFolder}
              placeholder="フォルダ名を入力"
            />
          </div>

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

// ── Divider ───────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 1,
        height: 14,
        background: "var(--section-divider, #ebebeb)",
        margin: "0 4px",
        verticalAlign: "middle",
      }}
    />
  );
}

// ── Filter chip ───────────────────────────────────────────────────────────────

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span
        style={{
          fontSize: 11,
          color: "var(--text-muted,#8a8a8a)",
          marginRight: 4,
        }}
      >
        {label}:
      </span>
      {children}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: 11,
        padding: "2px 7px",
        borderRadius: 3,
        border: `1px solid ${active ? "var(--sidebar-active-accent,#7aa6a1)" : "var(--section-divider,#ebebeb)"}`,
        background: active
          ? "var(--active-bg,rgba(104,154,152,0.1))"
          : "transparent",
        color: active
          ? "var(--sidebar-active-accent,#7aa6a1)"
          : "var(--text-muted,#8a8a8a)",
        cursor: "pointer",
        transition: "all 0.1s",
      }}
    >
      {label}
    </button>
  );
}

// ── Editable property value ───────────────────────────────────────────────────

function EditablePropertyValue({
  value,
  onCommit,
  placeholder,
}: {
  value: string;
  onCommit?: (v: string) => Promise<void>;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = async () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      await onCommit?.(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  if (!onCommit) {
    return (
      <span style={{ fontSize: "var(--font-size-body,13px)", color: "var(--text-primary,#1a1a1a)" }}>
        {value || placeholder}
      </span>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { void commit(); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { void commit(); }
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        style={{
          fontSize: "var(--font-size-body,13px)",
          color: "var(--text-primary,#1a1a1a)",
          border: "none",
          borderBottom: "1.5px solid var(--sidebar-active-accent,#7aa6a1)",
          background: "transparent",
          outline: "none",
          width: "100%",
          padding: "1px 0",
        }}
        autoFocus
      />
    );
  }

  return (
    <span
      onClick={() => {
        setEditing(true);
        requestAnimationFrame(() => inputRef.current?.select());
      }}
      title="クリックで編集"
      style={{
        fontSize: "var(--font-size-body,13px)",
        color: "var(--text-primary,#1a1a1a)",
        cursor: "text",
        display: "block",
        padding: "1px 0",
        borderBottom: "1px solid transparent",
        transition: "border-color 0.1s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderBottomColor =
          "var(--section-divider,#ebebeb)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderBottomColor = "transparent";
      }}
    >
      {value || (
        <span style={{ color: "var(--text-placeholder,#b0b0b0)" }}>
          {placeholder}
        </span>
      )}
    </span>
  );
}

// ── Card table section ────────────────────────────────────────────────────────

interface CardTableSectionProps {
  cards: Card[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onEmpty: ReactNode;
}

function CardTableSection({
  cards,
  sortKey,
  sortDir,
  onSort,
  onEmpty,
}: CardTableSectionProps) {
  if (cards.length === 0) return <>{onEmpty}</>;

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 500,
    color:
      sortKey === key
        ? "var(--sidebar-active-accent,#7aa6a1)"
        : "var(--text-muted,#8a8a8a)",
    textAlign: "left",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    borderBottom: "1px solid var(--section-divider,#ebebeb)",
    background: "#fafafa",
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "var(--font-size-body,13px)",
        }}
      >
        <thead>
          <tr>
            <th style={thStyle("title")} onClick={() => onSort("title")}>
              タイトル{sortKey === "title" && <SortIcon dir={sortDir} />}
            </th>
            <th style={thStyle("reviewCount")} onClick={() => onSort("reviewCount")}>
              復習回数{sortKey === "reviewCount" && <SortIcon dir={sortDir} />}
            </th>
            <th style={thStyle("nextReview")} onClick={() => onSort("nextReview")}>
              次回復習{sortKey === "nextReview" && <SortIcon dir={sortDir} />}
            </th>
            <th
              style={{
                ...thStyle("order"),
                width: 60,
              }}
            >
              状態
            </th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card, i) => {
            const isDraft = card.isDraft ?? (card as unknown).is_draft;
            const reviewCount =
              card.reviewCount ?? (card as unknown).review_count ?? 0;
            const nextReview = toDate(
              card.nextReviewDate ?? (card as unknown).next_review_date,
            );
            const title = displayTitle(card);

            return (
              <tr
                key={card.id}
                style={{
                  borderBottom: "1px solid var(--section-divider,#ebebeb)",
                  background: i % 2 === 0 ? "#fff" : "#fafafa",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--hover-bg,rgba(0,0,0,0.03))";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    i % 2 === 0 ? "#fff" : "#fafafa";
                }}
              >
                <td
                  style={{
                    padding: "6px 8px",
                    color: "var(--text-primary,#1a1a1a)",
                    maxWidth: 320,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {title}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    color: "var(--text-secondary,#4b4b4b)",
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}
                >
                  {reviewCount}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    color: "var(--text-muted,#8a8a8a)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {nextReview
                    ? nextReview.toLocaleDateString("ja-JP", {
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </td>
                <td style={{ padding: "6px 8px" }}>
                  {isDraft ? (
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted,#8a8a8a)",
                        border: "1px solid var(--section-divider,#ebebeb)",
                        borderRadius: 2,
                        padding: "1px 5px",
                      }}
                    >
                      下書き
                    </span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Card scroll section ───────────────────────────────────────────────────────

const CARD_SCROLL_AMOUNT = 216;

function CardScrollSection({
  cards,
  onEmpty,
}: {
  cards: Card[];
  onEmpty: ReactNode;
}) {
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
          {cards.map((card, i) => {
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
                  width: 196,
                  border: `1px solid ${T.border}`,
                  borderRadius: 4,
                  padding: "10px 12px",
                  background: i % 3 === 0 ? "#fff" : "#fafafa",
                  transition: "border-color 0.15s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = T.accent;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = T.border;
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
                      fontSize: T.fsBody,
                      fontWeight: 500,
                      color: T.textPrimary,
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
                  {isDraft && (
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 10,
                        color: T.textMuted,
                        border: `1px solid ${T.divider}`,
                        borderRadius: 2,
                        padding: "0 4px",
                        lineHeight: "16px",
                      }}
                    >
                      下書き
                    </span>
                  )}
                </div>
                {snippet ? (
                  <p
                    style={{
                      fontSize: T.fsMeta,
                      color: T.textMuted,
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
                {reviewText && (
                  <p
                    style={{
                      fontSize: 11,
                      color: T.textPlaceholder,
                      marginTop: 8,
                    }}
                  >
                    次回 {reviewText}
                  </p>
                )}
              </article>
            );
          })}
          <div style={{ flexShrink: 0, width: 8 }} aria-hidden="true" />
        </div>
      </div>

      {/* Fades */}
      <div
        aria-hidden="true"
        style={{
          pointerEvents: "none",
          position: "absolute",
          left: 0,
          top: 0,
          height: "100%",
          width: 40,
          background: "linear-gradient(to right,#fff 0%,transparent 100%)",
          opacity: canScrollLeft ? 1 : 0,
          transition: "opacity 0.2s",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          pointerEvents: "none",
          position: "absolute",
          right: 0,
          top: 0,
          height: "100%",
          width: 48,
          background: "linear-gradient(to left,#fff 0%,transparent 100%)",
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
        border: `1px solid ${T.border}`,
        color: "var(--text-secondary,#4b4b4b)",
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



