import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { useSearchParams } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAuthSession } from "@/contexts/AuthContext";
import { RatingCountTiles } from "@/features/study/RatingCountTiles";
import { SurfaceButton } from "@/components/ui/surface-button";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/ui/tag-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyMetaPanel } from "@/components/card/panels/EmptyMetaPanel";
import { MetaPanelLeadSection } from "@/components/card/panels/MetaPanelShell";
import { firestoreDb } from "@/services/firebase";
import { getLocalDb } from "@/services/localDB";
import {
  createLatestReviewLogPatch,
  createReviewPatchFromRating,
} from "@/services/reviewAlgorithm";
import type { Card, ReviewLog } from "@/types";
import { calculateResistanceScore } from "@/utils/reviewMetrics";
import { useTags, resolveCardTagNames } from "@/hooks/settings/useTags";

type Period = "7d" | "30d" | "all";
type MetaRating = ReviewLog["rating"] | null;
type MetaReviewLog = {
  reviewedAt: string;
  rating: MetaRating;
  resistanceScore: number | null;
  durationMinutes: number | null;
  reviewIndexHint?: number;
};

type CardMetaPanelProps = {
  card: Card | null;
  isEditingCard?: boolean;
  reviewLogs?: ReviewLog[];
  onAddReviewLog: (input: {
    reviewedAt: string;
    rating: ReviewLog["rating"];
    durationMinutes?: number | null;
  }) => void | Promise<void> | Promise<unknown>;
  onUpdateLatestReviewLog?: (input: {
    reviewLogs: ReviewLog[];
    reviewedAt: string;
    rating: ReviewLog["rating"];
    durationMinutes?: number | null;
  }) => void | Promise<void> | Promise<unknown>;
  onDeleteLatestReviewLog?: (input: {
    reviewLogs: ReviewLog[];
  }) => void | Promise<void> | Promise<unknown>;
  onUpdateReviewLogDuration?: (input: {
    reviewLogs: ReviewLog[];
    logIndex: number;
    durationMinutes: number | null;
  }) => void | Promise<void> | Promise<unknown>;
  onFlushAutosave?: () => void | Promise<void>;
  onTitleInputChange?: (nextTitle: string) => void | Promise<void>;
  onUpdateTags: (nextTags: string[]) => void;
  onToggleDraft: (isDraft: boolean) => void;
  onUpdateTitle: (nextTitle: string) => void;
  delayBonusEnabled?: boolean;
  reviewStartNextDay?: boolean;
  mode?: "full" | "calendar";
};

const META_DATE_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const RATING_LABELS: Record<ReviewLog["rating"], string> = {
  1: "忘れた",
  2: "あいまい",
  3: "覚えた",
  4: "余裕",
};

const RATING_TONE_CLASS: Record<ReviewLog["rating"], string> = {
  1: "bg-red-50 text-[#c2410c]",
  2: "bg-amber-50 text-[#b45309]",
  3: "bg-sky-50 text-[#0369a1]",
  4: "bg-emerald-50 text-[#047857]",
};

const RATING_FACE_DESIGN: Record<
  ReviewLog["rating"],
  { iconWrap: string; svg: ReactElement }
> = {
  1: {
    iconWrap: "bg-red-50 text-[#FF5A65] face-badge-convex",
    svg: (
      <>
        <circle cx="12" cy="12" r="10" stroke="none" />
        <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </>
    ),
  },
  2: {
    iconWrap: "bg-amber-50 text-[#F9A825] face-badge-convex",
    svg: (
      <>
        <line x1="8" y1="15" x2="16" y2="15" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </>
    ),
  },
  3: {
    iconWrap: "bg-blue-50 text-[#00A3FF] face-badge-convex",
    svg: (
      <>
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </>
    ),
  },
  4: {
    iconWrap: "bg-emerald-50 text-[#00B67A] face-badge-convex",
    svg: (
      <>
        <path d="M8 13s1.5 3 4 3 4-3 4-3" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </>
    ),
  },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    if (value.trim() === "") return null;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

function toValidDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function formatDateLabel(value: unknown) {
  const date = toValidDate(value);
  if (!date) return "未設定";
  return META_DATE_FORMATTER.format(date);
}

function toDateTimeLocalValue(value: unknown): string {
  const date = toValidDate(value);
  if (!date) return "";
  const localMs = date.getTime() - date.getTimezoneOffset() * 60 * 1000;
  return new Date(localMs).toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toRatingValue(value: unknown): ReviewLog["rating"] | null {
  const numeric = toFiniteNumber(value);
  if (numeric === null) return null;
  const rounded = Math.round(numeric);
  if (rounded < 1 || rounded > 4) return null;
  return rounded as ReviewLog["rating"];
}

function normalizeDurationMinutes(value: unknown): number | null {
  const numeric = toFiniteNumber(value);
  if (numeric === null) return null;
  return Math.max(0, Math.round(numeric));
}

function formatDurationMinutes(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${Math.max(0, Math.round(value))} min.`;
}

function normalizeMetaReviewLog(value: unknown): MetaReviewLog | null {
  const log = asRecord(value);
  if (!log) return null;

  const reviewedAt = toValidDate(
    log.reviewedAt ??
      log.reviewed_at ??
      log.studiedAt ??
      log.studied_at ??
      log.createdAt ??
      log.created_at,
  );
  if (!reviewedAt) return null;

  const directRating = toRatingValue(
    log.rating ?? log.ratingNum ?? log.rating_num,
  );
  const subjectiveScore = toFiniteNumber(
    log.subjectiveScore ??
      log.subjective_score ??
      log.lastSubjectiveScore ??
      log.last_subjective_score,
  );
  const rating =
    directRating ??
    (subjectiveScore === null ? null : toRatingValue(subjectiveScore + 1));

  const resistanceScoreRaw = toFiniteNumber(
    log.resistanceScore ??
      log.resistance_score ??
      log.endurance ??
      log.endurance_score,
  );

  return {
    reviewedAt: reviewedAt.toISOString(),
    rating,
    resistanceScore:
      resistanceScoreRaw === null
        ? null
        : Math.max(0, Math.min(100, resistanceScoreRaw)),
    durationMinutes: normalizeDurationMinutes(
      log.durationMinutes ??
        log.duration_minutes ??
        log.durationMin ??
        log.duration_min,
    ),
  };
}

function dedupeMetaReviewLogs(logs: MetaReviewLog[]): MetaReviewLog[] {
  const unique = new Map<string, MetaReviewLog>();
  for (const log of logs) {
    const reviewedAt = toValidDate(log.reviewedAt);
    const minuteKey = reviewedAt
      ? Math.floor(reviewedAt.getTime() / 60000)
      : log.reviewedAt;
    const key = `${minuteKey}:${log.rating ?? "unknown"}`;
    if (!unique.has(key)) {
      unique.set(key, log);
      continue;
    }
    const current = unique.get(key)!;
    if (current.resistanceScore == null && log.resistanceScore != null) {
      unique.set(key, log);
    }
  }

  return [...unique.values()].sort((a, b) => {
    const aTs =
      toValidDate(a.reviewedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
    const bTs =
      toValidDate(b.reviewedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
    return aTs - bTs;
  });
}

function getRatingLabel(rating: MetaRating): string {
  if (rating === null) return "不明";
  return RATING_LABELS[rating] ?? String(rating);
}

function getRatingToneClass(rating: MetaRating): string {
  if (rating === null) return "bg-slate-100 text-slate-500";
  return RATING_TONE_CLASS[rating];
}

function getRatingFaceDesign(rating: MetaRating) {
  if (rating === null) return null;
  return RATING_FACE_DESIGN[rating];
}

function isWithinSameMinute(a: unknown, b: unknown): boolean {
  const aDate = toValidDate(a);
  const bDate = toValidDate(b);
  if (!aDate || !bDate) return false;
  return Math.abs(aDate.getTime() - bDate.getTime()) < 60 * 1000;
}

function toEditableReviewLogs(logs: MetaReviewLog[]): ReviewLog[] {
  return logs
    .filter(
      (log): log is MetaReviewLog & { rating: ReviewLog["rating"] } =>
        log.rating !== null,
    )
    .map((log) => ({
      reviewedAt: log.reviewedAt,
      rating: log.rating,
      resistanceScore:
        typeof log.resistanceScore === "number" &&
        Number.isFinite(log.resistanceScore)
          ? log.resistanceScore
          : 0,
      durationMinutes: log.durationMinutes ?? null,
    }));
}

const cardMetaDraftFlag = (card: Card | null): boolean =>
  Boolean(card?.isDraft ?? (card as Record<string, unknown> | null)?.is_draft);

const cardMetaReviewCount = (card: Card | null): number =>
  Number(
    card?.reviewCount ?? (card as Record<string, unknown> | null)?.review_count ?? 0,
  );

const cardMetaLastSubjectiveScore = (card: Card | null): number | null => {
  const value =
    card?.lastSubjectiveScore ??
    (card as Record<string, unknown> | null)?.last_subjective_score;
  return toFiniteNumber(value);
};

const cardMetaDateTimeMs = (
  value: unknown,
): number | null => {
  const date = toValidDate(value);
  return date ? date.getTime() : null;
};

const areCardMetaCardsEqual = (
  prev: Card | null,
  next: Card | null,
): boolean => {
  if (prev === next) return true;
  if (!prev || !next) return false;

  if (prev.id !== next.id) return false;
  if ((prev.title ?? "") !== (next.title ?? "")) return false;
  if (cardMetaDraftFlag(prev) !== cardMetaDraftFlag(next)) return false;
  if (cardMetaReviewCount(prev) !== cardMetaReviewCount(next)) return false;
  if (cardMetaLastSubjectiveScore(prev) !== cardMetaLastSubjectiveScore(next))
    return false;

  const prevLegacy = prev as Record<string, unknown>;
  const nextLegacy = next as Record<string, unknown>;
  const prevNextReviewDate = cardMetaDateTimeMs(
    prev.nextReviewDate ?? prevLegacy.next_review_date,
  );
  const nextNextReviewDate = cardMetaDateTimeMs(
    next.nextReviewDate ?? nextLegacy.next_review_date,
  );
  if (prevNextReviewDate !== nextNextReviewDate) return false;

  const prevLastReviewAt = cardMetaDateTimeMs(
    prev.lastReviewAt ?? prevLegacy.last_review_at,
  );
  const nextLastReviewAt = cardMetaDateTimeMs(
    next.lastReviewAt ?? nextLegacy.last_review_at,
  );
  if (prevLastReviewAt !== nextLastReviewAt) return false;

  if (prev.tagIds !== next.tagIds) return false;
  if (prevLegacy.tags !== nextLegacy.tags) return false;

  return true;
};

const areCardMetaPanelPropsEqual = (
  prev: CardMetaPanelProps,
  next: CardMetaPanelProps,
): boolean =>
  areCardMetaCardsEqual(prev.card, next.card) &&
  prev.isEditingCard === next.isEditingCard &&
  prev.reviewLogs === next.reviewLogs &&
  prev.onAddReviewLog === next.onAddReviewLog &&
  prev.onUpdateLatestReviewLog === next.onUpdateLatestReviewLog &&
  prev.onDeleteLatestReviewLog === next.onDeleteLatestReviewLog &&
  prev.onUpdateReviewLogDuration === next.onUpdateReviewLogDuration &&
  prev.onFlushAutosave === next.onFlushAutosave &&
  prev.onTitleInputChange === next.onTitleInputChange &&
  prev.onUpdateTags === next.onUpdateTags &&
  prev.onToggleDraft === next.onToggleDraft &&
  prev.onUpdateTitle === next.onUpdateTitle &&
  prev.delayBonusEnabled === next.delayBonusEnabled &&
  prev.reviewStartNextDay === next.reviewStartNextDay &&
  prev.mode === next.mode;

function CardMetaPanelInner({
  card,
  isEditingCard = false,
  reviewLogs = [],
  onAddReviewLog,
  onUpdateLatestReviewLog,
  onDeleteLatestReviewLog,
  onUpdateReviewLogDuration,
  onFlushAutosave,
  onTitleInputChange,
  onUpdateTags,
  onToggleDraft,
  onUpdateTitle,
  delayBonusEnabled = false,
  reviewStartNextDay = true,
  mode = "full",
}: CardMetaPanelProps) {
  const isCalendarMode = mode === "calendar";
  const infoRowClass =
    "h-[var(--meta-row-px)] leading-[var(--meta-row-px)] text-[length:var(--meta-font-size)] text-[var(--sidebar-text)]";
  const actionRowClass =
    "h-[var(--meta-row-px)] min-h-[var(--meta-row-px)] flex items-center";
  const getDurationInputWidthCh = (value: string): string => {
    const digits = value.trim().length;
    const widthCh = Math.min(6, Math.max(1, digits));
    return `calc(${widthCh}ch + 0.4rem)`;
  };
  const [period, setPeriod] = useState<Period>("30d");
  const [titleInput, setTitleInput] = useState(card?.title ?? "");
  const draftFlag = Boolean(card?.isDraft ?? (card as unknown)?.is_draft);
  const [draftChecked, setDraftChecked] = useState(draftFlag);
  const [isSavingPendingReview, setIsSavingPendingReview] = useState(false);
  const [pendingReviewTimestamp, setPendingReviewTimestamp] = useState<
    string | null
  >(null);
  const [pendingReviewRatingInput, setPendingReviewRatingInput] = useState<
    ReviewLog["rating"] | null
  >(null);
  const [pendingReviewDurationInput, setPendingReviewDurationInput] =
    useState("");
  const [isEditingLatestReview, setIsEditingLatestReview] = useState(false);
  const [latestReviewDateInput, setLatestReviewDateInput] = useState("");
  const [latestReviewRatingInput, setLatestReviewRatingInput] = useState<
    ReviewLog["rating"] | null
  >(null);
  const [latestReviewDurationInput, setLatestReviewDurationInput] =
    useState("");
  const [isMutatingLatestReview, setIsMutatingLatestReview] = useState(false);
  const [latestReviewError, setLatestReviewError] = useState<string | null>(
    null,
  );
  const [durationDrafts, setDurationDrafts] = useState<Record<number, string>>(
    {},
  );
  const titleComposingRef = useRef(false);
  const titleFlushAfterCompositionRef = useRef(false);
  const [durationSavingIndex, setDurationSavingIndex] = useState<number | null>(
    null,
  );
  const [, setSearchParams] = useSearchParams();
  const { currentUser } = useAuthSession();
  const { tagById } = useTags();
  const canPersistReview = Boolean(card?.id && card.id !== "__draft__");

  // reviewCount は snake_case で入ってくるケースがあるので両対応しておく（UI側は事故らないのが正義）
  const rawReviewCount = (card?.reviewCount ??
    (card as unknown)?.review_count ??
    0) as unknown;
  const normalizedReviewCount = Number.isFinite(Number(rawReviewCount))
    ? Math.max(0, Math.trunc(Number(rawReviewCount)))
    : 0;

  useEffect(() => {
    queueMicrotask(() => setTitleInput(card?.title ?? ""));
  }, [card?.id, card?.title]);

  useEffect(() => {
    queueMicrotask(() => setDraftChecked(draftFlag));
  }, [card?.id, draftFlag]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setPendingReviewTimestamp(null);
      setPendingReviewRatingInput(null);
      setPendingReviewDurationInput("");
    });
    return () => {
      cancelled = true;
    };
  }, [card?.id]);

  const shouldLoadStudyLogs =
    reviewLogs.length === 0 && canPersistReview && Boolean(currentUser?.uid);

  const localStudyLogs = useLiveQuery(async () => {
    if (!shouldLoadStudyLogs || !currentUser?.uid || !card?.id) return [];
    const db = await getLocalDb(currentUser.uid);
    const logs = await db.table("studyLogs").toArray();
    return logs.filter((log) => {
      const record = asRecord(log);
      const logCardId = record?.cardId ?? record?.card_id;
      return typeof logCardId === "string" && logCardId === card.id;
    });
  }, [shouldLoadStudyLogs, currentUser?.uid, card?.id]);

  const { data: remoteStudyLogs = [] } = useQuery({
    queryKey: ["card-meta-study-logs", currentUser?.uid, card?.id],
    queryFn: async () => {
      if (!currentUser?.uid || !card?.id || !firestoreDb) return [];
      const q = query(
        collection(firestoreDb, "studyLogs"),
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((log) => {
          const record = asRecord(log);
          const logCardId = record?.cardId ?? record?.card_id;
          return typeof logCardId === "string" && logCardId === card.id;
        })
        .slice(0, 200);
    },
    enabled: shouldLoadStudyLogs && Boolean(firestoreDb),
  });

  const derivedResistanceScore = useMemo(() => {
    if (!card) return null;
    const next = toValidDate(
      card.nextReviewDate ?? (card as unknown).next_review_date,
    );
    const last = toValidDate(
      card.lastReviewAt ?? (card as unknown).last_review_at,
    );
    if (!next || !last) return null;
    const intervalDays = Math.max(
      0,
      (next.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
    );
    return calculateResistanceScore(intervalDays);
  }, [card]);

  const normalizedCardReviewLogs = useMemo(
    () =>
      dedupeMetaReviewLogs(
        reviewLogs
          .map((log) => normalizeMetaReviewLog(log))
          .filter((log): log is MetaReviewLog => log !== null),
      ),
    [reviewLogs],
  );

  const fallbackStudyReviewLogs = useMemo(() => {
    if (!shouldLoadStudyLogs) return [];
    const merged = [...(localStudyLogs ?? []), ...remoteStudyLogs];
    const normalized = dedupeMetaReviewLogs(
      merged
        .map((log) => normalizeMetaReviewLog(log))
        .filter((log): log is MetaReviewLog => log !== null),
    );
    if (normalized.length === 0) return normalized;

    const lastReviewAt = toValidDate(
      card?.lastReviewAt ?? (card as unknown)?.last_review_at,
    );
    if (!lastReviewAt || derivedResistanceScore === null) return normalized;

    const lastIndex = normalized.length - 1;
    const lastLog = normalized[lastIndex];
    if (
      lastLog &&
      lastLog.resistanceScore == null &&
      isWithinSameMinute(lastLog.reviewedAt, lastReviewAt)
    ) {
      return [
        ...normalized.slice(0, -1),
        { ...lastLog, resistanceScore: derivedResistanceScore },
      ];
    }

    return normalized;
  }, [
    shouldLoadStudyLogs,
    localStudyLogs,
    remoteStudyLogs,
    card,
    derivedResistanceScore,
  ]);

  const mergedStoredLogs = useMemo(
    () =>
      dedupeMetaReviewLogs([
        ...normalizedCardReviewLogs,
        ...fallbackStudyReviewLogs,
      ]),
    [normalizedCardReviewLogs, fallbackStudyReviewLogs],
  );

  const syntheticSummaryLogs = useMemo(() => {
    if (!card) return [];
    if (mergedStoredLogs.length > 0) return [];
    if (normalizedReviewCount <= 0) return [];

    const lastReviewAt = toValidDate(
      card.lastReviewAt ?? (card as unknown).last_review_at,
    );
    if (!lastReviewAt) return [];

    const rawLastSubjectiveScore = toFiniteNumber(
      card.lastSubjectiveScore ?? (card as unknown).last_subjective_score,
    );
    const syntheticRating =
      rawLastSubjectiveScore === null
        ? null
        : toRatingValue(rawLastSubjectiveScore + 1);

    return [
      {
        reviewedAt: lastReviewAt.toISOString(),
        rating: syntheticRating,
        resistanceScore: derivedResistanceScore,
        durationMinutes: null,
        reviewIndexHint: normalizedReviewCount,
      } satisfies MetaReviewLog,
    ];
  }, [
    card,
    mergedStoredLogs.length,
    normalizedReviewCount,
    derivedResistanceScore,
  ]);

  const safeLogs = useMemo(() => {
    if (mergedStoredLogs.length > 0) return mergedStoredLogs;
    return syntheticSummaryLogs;
  }, [mergedStoredLogs, syntheticSummaryLogs]);

  const editableReviewLogs = useMemo(() => {
    const storedLogs = toEditableReviewLogs(mergedStoredLogs);
    if (storedLogs.length > 0) return storedLogs;

    // reviewLogs が欠損している旧データでも、1回分だけなら安全に復元編集できる。
    if (normalizedReviewCount === 1) {
      const syntheticLogs = toEditableReviewLogs(syntheticSummaryLogs);
      if (syntheticLogs.length > 0) return syntheticLogs;
    }

    return [];
  }, [mergedStoredLogs, normalizedReviewCount, syntheticSummaryLogs]);
  const latestEditableReview = editableReviewLogs.at(-1) ?? null;
  const previousEditableReview =
    editableReviewLogs.length > 1 ? (editableReviewLogs.at(-2) ?? null) : null;
  const canManageLatestReview = Boolean(
    latestEditableReview &&
    onUpdateLatestReviewLog &&
    onDeleteLatestReviewLog &&
    canPersistReview,
  );

  const latestReview = safeLogs.at(-1);

  const pendingPreviewResistanceScore = useMemo(() => {
    if (!card || !pendingReviewTimestamp || !pendingReviewRatingInput) {
      return null;
    }

    try {
      const { reviewLog } = createReviewPatchFromRating({
        card: {
          ...card,
          reviewLogs: editableReviewLogs,
        },
        rating: pendingReviewRatingInput,
        now: new Date(pendingReviewTimestamp),
        delayBonusEnabled,
        durationMinutes: normalizeDurationMinutes(pendingReviewDurationInput),
      });
      return reviewLog.resistanceScore;
    } catch {
      return null;
    }
  }, [
    card,
    pendingReviewTimestamp,
    pendingReviewRatingInput,
    editableReviewLogs,
    delayBonusEnabled,
    pendingReviewDurationInput,
  ]);

  const editingPreviewResistanceScore = useMemo(() => {
    if (!card || !latestEditableReview || !latestReviewRatingInput) return null;
    const reviewedAt = fromDateTimeLocalValue(latestReviewDateInput);
    if (!reviewedAt) return null;

    try {
      const { reviewLog } = createLatestReviewLogPatch({
        action: "update",
        card: {
          ...card,
          reviewLogs: editableReviewLogs,
        },
        delayBonusEnabled,
        reviewLogs: editableReviewLogs,
        reviewStartNextDay,
        reviewedAt,
        rating: latestReviewRatingInput,
        durationMinutes: normalizeDurationMinutes(latestReviewDurationInput),
      });
      return reviewLog?.resistanceScore ?? null;
    } catch {
      return null;
    }
  }, [
    card,
    latestEditableReview,
    latestReviewRatingInput,
    latestReviewDateInput,
    editableReviewLogs,
    delayBonusEnabled,
    reviewStartNextDay,
  ]);

  const currentResistanceScore = useMemo(() => {
    if (isEditingLatestReview && editingPreviewResistanceScore != null) {
      return editingPreviewResistanceScore;
    }
    if (pendingPreviewResistanceScore != null) {
      return pendingPreviewResistanceScore;
    }
    if (
      latestReview?.resistanceScore != null &&
      latestReview.resistanceScore > 0
    ) {
      return latestReview.resistanceScore;
    }
    return derivedResistanceScore;
  }, [
    isEditingLatestReview,
    editingPreviewResistanceScore,
    pendingPreviewResistanceScore,
    latestReview,
    derivedResistanceScore,
  ]);

  // SSOT は card.reviewCount（互換あり）。ログはあってもなくても表示が壊れないよう max を取る。
  const completedReviewCount = Math.max(
    normalizedReviewCount,
    safeLogs.reduce(
      (max, log, idx) => Math.max(max, log.reviewIndexHint ?? idx + 1),
      0,
    ),
  );
  const nextReviewAttempt = completedReviewCount + 1;

  const distribution20 = useMemo(() => {
    const base = { forgot: 0, vague: 0, remembered: 0, easy: 0 };
    for (const log of safeLogs.slice(-20)) {
      if (log.rating === 1) base.forgot += 1;
      else if (log.rating === 2) base.vague += 1;
      else if (log.rating === 3) base.remembered += 1;
      else if (log.rating === 4) base.easy += 1;
    }
    return base;
  }, [safeLogs]);

  const chartData = useMemo(() => {
    const all = safeLogs
      .filter(
        (log) =>
          typeof log.resistanceScore === "number" &&
          Number.isFinite(log.resistanceScore) &&
          log.resistanceScore > 0,
      )
      .map((log, idx) => ({
        reviewIndex: log.reviewIndexHint ?? idx + 1,
        resistanceScore: log.resistanceScore!,
      }));
    if (period === "all") return all;
    const count = period === "7d" ? 7 : 30;
    return all.slice(-count);
  }, [safeLogs, period]);

  const xTicks = useMemo(() => {
    if (chartData.length <= 1) return chartData.map((d) => d.reviewIndex);
    return chartData
      .filter((_, idx) => idx % 5 === 0 || idx === chartData.length - 1)
      .map((d) => d.reviewIndex);
  }, [chartData]);

  const historyRows = useMemo(
    () =>
      safeLogs.map((log, idx) => ({
        reviewedAtRaw: log.reviewedAt,
        reviewIndex: log.reviewIndexHint ?? idx + 1,
        reviewedAtLabel: formatDateLabel(log.reviewedAt),
        rating: log.rating,
        ratingLabel: getRatingLabel(log.rating),
        ratingToneClass: getRatingToneClass(log.rating),
        ratingFaceDesign: getRatingFaceDesign(log.rating),
        durationMinutes: log.durationMinutes ?? null,
        durationLabel: formatDurationMinutes(log.durationMinutes ?? null),
        editableLogIndex:
          idx < editableReviewLogs.length && log.rating !== null ? idx : null,
        isLatestEditable: idx === safeLogs.length - 1 && canManageLatestReview,
        resistanceScore: (() => {
          const score =
            idx === safeLogs.length - 1 &&
            canManageLatestReview &&
            isEditingLatestReview &&
            editingPreviewResistanceScore != null
              ? editingPreviewResistanceScore
              : log.resistanceScore;
          return typeof score === "number" && Number.isFinite(score)
            ? `${score}%`
            : "-";
        })(),
      })),
    [
      canManageLatestReview,
      safeLogs,
      editableReviewLogs.length,
      isEditingLatestReview,
      editingPreviewResistanceScore,
    ],
  );

  const displayHistoryRows = useMemo(() => {
    if (!pendingReviewTimestamp) return historyRows;
    return [
      ...historyRows,
      {
        reviewedAtRaw: pendingReviewTimestamp,
        reviewIndex: completedReviewCount + 1,
        reviewedAtLabel: formatDateLabel(pendingReviewTimestamp),
        rating: null,
        ratingLabel: "選択",
        ratingToneClass: getRatingToneClass(null),
        ratingFaceDesign: null,
        durationMinutes: normalizeDurationMinutes(pendingReviewDurationInput),
        durationLabel: formatDurationMinutes(
          normalizeDurationMinutes(pendingReviewDurationInput),
        ),
        editableLogIndex: null,
        resistanceScore:
          pendingPreviewResistanceScore != null
            ? `${pendingPreviewResistanceScore}%`
            : "-",
        isLatestEditable: false,
        isPending: true,
      },
    ];
  }, [
    pendingReviewTimestamp,
    historyRows,
    completedReviewCount,
    pendingPreviewResistanceScore,
    pendingReviewDurationInput,
  ]);

  // tagIds 優先、fallback: card.tags（移行期間互換）
  const tags = resolveCardTagNames(card?.tagIds, card?.tags, tagById);

  const commitTitle = (rawValue?: string, options?: { flush?: boolean }) => {
    const source = rawValue ?? titleInput;
    const next = source.trim();
    if (next !== source) {
      handleTitleInputChange(next);
    }
    if (!isEditingCard && (card?.title ?? "").trim() !== next) {
      void Promise.resolve(onUpdateTitle(next)).catch(() => {});
    }
    if (!options?.flush || !onFlushAutosave) return;
    void Promise.resolve(onFlushAutosave()).catch(() => {});
  };

  const handleTitleInputChange = (next: string) => {
    setTitleInput(next);
    if (!onTitleInputChange) return;
    void Promise.resolve(onTitleInputChange(next)).catch(() => {});
  };

  const openTagSettings = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("settings", "true");
        next.set("settingsTab", "tags");
        return next;
      },
      { replace: true },
    );
  };

  const handleStartAddReview = () => {
    if (!canPersistReview) return;
    if (pendingReviewTimestamp) return;
    if (isEditingLatestReview || isMutatingLatestReview) return;
    setPendingReviewTimestamp(new Date().toISOString());
    setPendingReviewRatingInput(null);
    setPendingReviewDurationInput("");
  };

  const handleSelectReviewRating = (rating: ReviewLog["rating"]) => {
    if (!pendingReviewTimestamp) return;
    if (isSavingPendingReview) return;
    setPendingReviewRatingInput(rating);
    setIsSavingPendingReview(true);
    const reviewedAt = pendingReviewTimestamp ?? new Date().toISOString();
    void Promise.resolve(
      onAddReviewLog({
        reviewedAt,
        rating,
        durationMinutes: normalizeDurationMinutes(pendingReviewDurationInput),
      }),
    )
      .then(() => {
        setPendingReviewTimestamp(null);
        setPendingReviewRatingInput(null);
        setPendingReviewDurationInput("");
      })
      .catch(() => {
        setPendingReviewRatingInput(null);
      })
      .finally(() => {
        setIsSavingPendingReview(false);
      });
  };

  const handleCancelPendingReview = () => {
    setPendingReviewTimestamp(null);
    setPendingReviewRatingInput(null);
    setPendingReviewDurationInput("");
  };

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setIsEditingLatestReview(false);
      setLatestReviewDateInput(
        toDateTimeLocalValue(latestEditableReview?.reviewedAt),
      );
      setLatestReviewRatingInput(latestEditableReview?.rating ?? null);
      setLatestReviewDurationInput(
        latestEditableReview?.durationMinutes != null
          ? String(latestEditableReview.durationMinutes)
          : "",
      );
      setIsMutatingLatestReview(false);
      setLatestReviewError(null);
      setDurationDrafts({});
      setDurationSavingIndex(null);
    });
    return () => {
      cancelled = true;
    };
  }, [
    card?.id,
    latestEditableReview?.durationMinutes,
    latestEditableReview?.rating,
    latestEditableReview?.reviewedAt,
  ]);

  const handleStartEditLatestReview = () => {
    if (!latestEditableReview) return;
    setLatestReviewDateInput(
      toDateTimeLocalValue(latestEditableReview.reviewedAt),
    );
    setLatestReviewRatingInput(latestEditableReview.rating);
    setLatestReviewDurationInput(
      latestEditableReview.durationMinutes != null
        ? String(latestEditableReview.durationMinutes)
        : "",
    );
    setLatestReviewError(null);
    setIsEditingLatestReview(true);
  };

  const handleCancelEditLatestReview = () => {
    setIsEditingLatestReview(false);
    setLatestReviewDateInput(
      toDateTimeLocalValue(latestEditableReview?.reviewedAt),
    );
    setLatestReviewRatingInput(latestEditableReview?.rating ?? null);
    setLatestReviewDurationInput(
      latestEditableReview?.durationMinutes != null
        ? String(latestEditableReview.durationMinutes)
        : "",
    );
    setLatestReviewError(null);
  };

  const handleSaveLatestReview = () => {
    if (!latestEditableReview || !onUpdateLatestReviewLog) return;
    if (isMutatingLatestReview) return;

    const reviewedAt = fromDateTimeLocalValue(latestReviewDateInput);
    if (!reviewedAt) {
      setLatestReviewError("日時を入力してください。");
      return;
    }
    if (!latestReviewRatingInput) {
      setLatestReviewError("評価を選択してください。");
      return;
    }

    const previousReviewedAt = toValidDate(previousEditableReview?.reviewedAt);
    if (
      previousReviewedAt &&
      reviewedAt.getTime() < previousReviewedAt.getTime()
    ) {
      setLatestReviewError("最新記録は1つ前の記録より前に移動できません。");
      return;
    }

    setIsMutatingLatestReview(true);
    setLatestReviewError(null);
    void Promise.resolve(
      onUpdateLatestReviewLog({
        reviewLogs: editableReviewLogs,
        reviewedAt: reviewedAt.toISOString(),
        rating: latestReviewRatingInput,
        durationMinutes: normalizeDurationMinutes(latestReviewDurationInput),
      }),
    )
      .then(() => {
        setIsEditingLatestReview(false);
      })
      .catch(() => {
        setLatestReviewError("最新の学習記録を更新できませんでした。");
      })
      .finally(() => {
        setIsMutatingLatestReview(false);
      });
  };

  const handleChangeDurationDraft = (logIndex: number, nextValue: string) => {
    setDurationDrafts((prev) => ({ ...prev, [logIndex]: nextValue }));
  };

  const handleSaveReviewDuration = (logIndex: number, rawValue: string) => {
    if (!onUpdateReviewLogDuration) return;
    if (durationSavingIndex !== null) return;
    const currentLog = editableReviewLogs[logIndex];
    if (!currentLog) return;

    const trimmed = rawValue.trim();
    if (trimmed !== "" && !/^\d+$/.test(trimmed)) {
      setLatestReviewError("所要時間は分単位の整数で入力してください。");
      setDurationDrafts((prev) => ({
        ...prev,
        [logIndex]:
          currentLog.durationMinutes != null
            ? String(currentLog.durationMinutes)
            : "",
      }));
      return;
    }

    const durationMinutes =
      trimmed === "" ? null : normalizeDurationMinutes(trimmed);
    if ((currentLog.durationMinutes ?? null) === durationMinutes) {
      setDurationDrafts((prev) => {
        const next = { ...prev };
        delete next[logIndex];
        return next;
      });
      return;
    }

    setLatestReviewError(null);
    setDurationSavingIndex(logIndex);
    void Promise.resolve(
      onUpdateReviewLogDuration({
        reviewLogs: editableReviewLogs,
        logIndex,
        durationMinutes,
      }),
    )
      .then(() => {
        setDurationDrafts((prev) => {
          const next = { ...prev };
          delete next[logIndex];
          return next;
        });
      })
      .catch(() => {
        setLatestReviewError("所要時間を更新できませんでした。");
        setDurationDrafts((prev) => ({
          ...prev,
          [logIndex]:
            currentLog.durationMinutes != null
              ? String(currentLog.durationMinutes)
              : "",
        }));
      })
      .finally(() => {
        setDurationSavingIndex(null);
      });
  };

  const handleDeleteLatestReview = () => {
    if (!latestEditableReview || !onDeleteLatestReviewLog) return;
    if (isMutatingLatestReview) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm("一番新しい学習記録を削除します。")
    ) {
      return;
    }

    setIsMutatingLatestReview(true);
    setLatestReviewError(null);
    void Promise.resolve(
      onDeleteLatestReviewLog({
        reviewLogs: editableReviewLogs,
      }),
    )
      .then(() => {
        setIsEditingLatestReview(false);
      })
      .catch(() => {
        setLatestReviewError("最新の学習記録を削除できませんでした。");
      })
      .finally(() => {
        setIsMutatingLatestReview(false);
      });
  };

  return (
    <EmptyMetaPanel>
      <MetaPanelLeadSection>
        {!isCalendarMode && (
          <>
            <div className={actionRowClass}>
              <input
                value={titleInput}
                onChange={(e) => handleTitleInputChange(e.target.value)}
                onCompositionStart={() => {
                  titleComposingRef.current = true;
                  titleFlushAfterCompositionRef.current = false;
                }}
                onCompositionEnd={(e) => {
                  titleComposingRef.current = false;
                  handleTitleInputChange(e.currentTarget.value);
                  if (titleFlushAfterCompositionRef.current) {
                    titleFlushAfterCompositionRef.current = false;
                    commitTitle(e.currentTarget.value, { flush: true });
                  }
                }}
                onBlur={(e) => {
                  if (titleComposingRef.current) {
                    titleFlushAfterCompositionRef.current = true;
                    return;
                  }
                  commitTitle(e.currentTarget.value, { flush: true });
                }}
                disabled={!card}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !titleComposingRef.current &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    commitTitle(e.currentTarget.value, { flush: true });
                  }
                }}
                className="h-[var(--meta-row-px)] w-full rounded-md border border-[var(--surface-border)] bg-white px-2 text-[length:var(--surface-placeholder-font-size)] leading-[var(--meta-row-px)] text-[#6e6466] surface-concave outline-none placeholder:text-[var(--surface-placeholder-text)] focus:border-[#cfcfcf] focus:bg-white"
                placeholder="タイトル"
              />
            </div>
            <div className={`${actionRowClass} justify-start gap-2`}>
              <Switch
                checked={draftChecked}
                onCheckedChange={(next) => {
                  setDraftChecked(next);
                  if (!card) return;
                  void Promise.resolve(onToggleDraft(next)).catch(() => {
                    setDraftChecked(
                      Boolean(card?.isDraft ?? (card as unknown)?.is_draft),
                    );
                  });
                }}
                disabled={!card}
              />
              <span className="text-[length:var(--meta-font-size)] font-medium leading-[var(--meta-row-px)] text-[var(--sidebar-text-muted)]">
                下書き
              </span>
            </div>
            <section>
              <div className={`${actionRowClass} justify-between`}>
                <h3 className="h-[var(--meta-row-px)] text-[length:var(--meta-font-size)] leading-[var(--meta-row-px)] font-semibold tracking-wide text-[var(--sidebar-text-muted)] uppercase">
                  タグ管理
                </h3>
                <SurfaceButton
                  type="button"
                  surface="convex"
                  size="xs"
                  className="h-[var(--meta-row-px)] text-[length:var(--meta-font-size)] leading-[var(--meta-row-px)]"
                  onClick={openTagSettings}
                >
                  設定で管理
                </SurfaceButton>
              </div>
              <div className="mt-2 rounded-md border border-[var(--surface-border)] bg-white px-2 py-1 surface-concave">
                <TagInput
                  tags={tags}
                  onChange={(nextTags) => {
                    if (!card) return;
                    onUpdateTags(nextTags);
                  }}
                  placeholder="タグを選択・追加"
                  quietHover
                  className={`bg-transparent ${!card ? "pointer-events-none opacity-60" : ""}`}
                />
              </div>
            </section>
          </>
        )}
        {!isCalendarMode && (
          <div className="space-y-0">
            <p className={infoRowClass}>
              作成日:{" "}
              {formatDateLabel(
                card?.createdAt ?? (card as unknown)?.created_at,
              )}
            </p>
            <p className={infoRowClass}>
              更新日:{" "}
              {formatDateLabel(
                card?.updatedAt ?? (card as unknown)?.updated_at,
              )}
            </p>
            <p className={infoRowClass}>
              最終復習日:{" "}
              {latestReview
                ? formatDateLabel(latestReview.reviewedAt)
                : formatDateLabel(
                    card?.lastReviewAt ?? (card as unknown)?.last_review_at,
                  )}
            </p>
            <p className={infoRowClass}>
              次回復習日 ({nextReviewAttempt}回目):{" "}
              {formatDateLabel(
                card?.nextReviewDate ?? (card as unknown)?.next_review_date,
              )}
            </p>
          </div>
        )}
      </MetaPanelLeadSection>

      {!isCalendarMode && (
        <section>
          <div className="mt-3 space-y-2"></div>
          <RatingCountTiles
            counts={distribution20}
            compact
            disableHover
            singleRow
            surface="concave"
            className="mt-3"
          />
        </section>
      )}

      {!isCalendarMode && (
        <section>
          {currentResistanceScore !== null && (
            <div className="mb-3 flex min-h-[var(--meta-action-min-h)] items-center justify-between rounded border border-[var(--sidebar-border)] bg-[var(--sidebar-active-bg)] px-2">
              <span className="text-[length:var(--meta-font-size)] font-medium leading-[var(--meta-row-px)] text-[var(--sidebar-text-muted)]">
                現在の耐性スコア
              </span>
              <span className="text-[length:var(--meta-font-size)] font-semibold leading-[var(--meta-row-px)] tabular-nums text-[var(--sidebar-text)]">
                {currentResistanceScore}%
              </span>
            </div>
          )}
          <div className="flex min-h-[var(--meta-action-min-h)] items-center justify-between">
            <h3 className="h-[var(--meta-row-px)] text-[length:var(--meta-font-size)] leading-[var(--meta-row-px)] font-semibold tracking-wide text-[var(--sidebar-text-muted)] uppercase">
              耐性スコア推移
            </h3>
            <div className="flex bg-white rounded border border-[var(--surface-border)] p-0.5 shadow-sm text-[length:var(--meta-font-size)]">
              {(["7d", "30d", "all"] as const).map((p) => (
                <SurfaceButton
                  key={p}
                  surface={period === p ? "convexActive" : "concave"}
                  size="xs"
                  className="h-[var(--meta-row-px)] leading-[var(--meta-row-px)]"
                  onClick={() => setPeriod(p)}
                >
                  {p === "all" ? "全期間" : p === "7d" ? "直近7" : "直近30"}
                </SurfaceButton>
              ))}
            </div>
          </div>
          <div className="mt-3 h-40 w-full rounded border border-[var(--sidebar-border)] bg-white/70 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[var(--sidebar-text-muted)]">
                データなし
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 10, left: 2, bottom: 4 }}
                >
                  <CartesianGrid
                    stroke="rgba(100,116,139,0.2)"
                    strokeDasharray="3 5"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="reviewIndex"
                    ticks={xTicks}
                    tick={{ fontSize: 10, fill: "var(--sidebar-text-muted)" }}
                    tickLine={{ stroke: "rgba(100,116,139,0.4)" }}
                    axisLine={{ stroke: "rgba(100,116,139,0.4)" }}
                    minTickGap={12}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 20, 40, 60, 80, 100]}
                    allowDecimals={false}
                    width={36}
                    tick={{ fontSize: 10, fill: "var(--sidebar-text-muted)" }}
                    tickLine={{ stroke: "rgba(100,116,139,0.4)" }}
                    axisLine={{ stroke: "rgba(100,116,139,0.4)" }}
                  />
                  <Tooltip
                    cursor={{ stroke: "rgba(15,23,42,0.15)", strokeWidth: 1 }}
                    formatter={(value) => [`${value}%`, "耐性スコア"]}
                    labelFormatter={(label) => `復習 ${label} 回目`}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid rgba(100,116,139,0.25)",
                      boxShadow: "0 6px 20px rgba(15, 23, 42, 0.12)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="resistanceScore"
                    stroke="#0f766e"
                    strokeWidth={2.5}
                    isAnimationActive={false}
                    dot={{ r: chartData.length === 1 ? 5 : 2.5, fill: "#0f766e" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      )}

      {!isCalendarMode && (
        <section>
          <div className="flex min-h-[var(--meta-action-min-h)] items-center justify-between">
            <h3 className="h-[var(--meta-row-px)] text-[length:var(--meta-font-size)] leading-[var(--meta-row-px)] font-semibold tracking-wide text-[var(--sidebar-text-muted)] uppercase">
              学習記録
            </h3>
            <div className="flex items-center gap-2">
              <SurfaceButton
                type="button"
                surface="convex"
                size="xs"
                className="h-[var(--meta-row-px)] leading-[var(--meta-row-px)]"
                onClick={handleStartAddReview}
                disabled={
                  !canPersistReview ||
                  !!pendingReviewTimestamp ||
                  isSavingPendingReview ||
                  isEditingLatestReview ||
                  isMutatingLatestReview
                }
              >
                + 追加
              </SurfaceButton>
            </div>
          </div>
          {canManageLatestReview && (
            <p className="mt-2 text-[11px] text-[var(--sidebar-text-muted)]">
              所要時間は全件編集できます。日時・評価の編集と削除は最新1件のみです。
            </p>
          )}
          {latestReviewError && (
            <div className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">
              {latestReviewError}
            </div>
          )}
          <div className="mt-3 overflow-hidden rounded border border-[var(--sidebar-border)] bg-[var(--sidebar-active-bg)]">
            {displayHistoryRows.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-sm text-[var(--sidebar-text-muted)]">
                学習記録なし
              </div>
            ) : (
              <Table className="text-[length:var(--meta-font-size)]">
                <TableHeader className="bg-white/70">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-7 w-px px-1 whitespace-nowrap text-[var(--sidebar-text-muted)]">
                      &nbsp;
                    </TableHead>
                    <TableHead className="h-7 min-w-[8.5rem] whitespace-nowrap py-0.5 text-[var(--sidebar-text-muted)]">
                      日時
                    </TableHead>
                    <TableHead className="h-7 min-w-[3.25rem] whitespace-nowrap px-1 py-0.5 text-[var(--sidebar-text-muted)]">
                      評価
                    </TableHead>
                    <TableHead className="h-7 min-w-[4.5rem] whitespace-nowrap px-1 py-0.5 text-[var(--sidebar-text-muted)]">
                      所要時間
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayHistoryRows.map((row) => (
                    <TableRow
                      key={`${row.reviewIndex}-${row.reviewedAtRaw ?? row.reviewedAtLabel}`}
                      className="bg-transparent hover:bg-white/40"
                    >
                      <TableCell className="w-px px-1 py-0.5 whitespace-nowrap font-medium tabular-nums text-[var(--sidebar-text)]">
                        {row.reviewIndex}
                      </TableCell>
                      <TableCell className="py-0.5 whitespace-nowrap tabular-nums text-[var(--sidebar-text)]">
                        {row.isLatestEditable && isEditingLatestReview ? (
                          <input
                            type="datetime-local"
                            value={latestReviewDateInput}
                            onChange={(e) =>
                              setLatestReviewDateInput(e.target.value)
                            }
                            disabled={isMutatingLatestReview}
                            className="h-7 w-full min-w-[11rem] rounded border border-[var(--surface-border)] bg-white px-1.5 text-[11px] outline-none focus:border-[#cfcfcf]"
                          />
                        ) : (
                          row.reviewedAtLabel
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-0.5">
                        {"isPending" in row && row.isPending ? (
                          <div className="flex flex-col items-center gap-0.5 py-0.5">
                            <div className="inline-grid grid-cols-2 gap-1 place-items-center">
                              {([1, 2, 3, 4] as const).map((rating) => {
                                const faceDesign = getRatingFaceDesign(rating);
                                return (
                                  <button
                                    key={rating}
                                    type="button"
                                    className="relative z-0 flex h-7 w-7 items-center justify-center rounded-md border border-[var(--surface-border)] bg-white transition-colors hover:bg-[var(--sidebar-active-bg)] disabled:cursor-wait disabled:opacity-50"
                                    onClick={() =>
                                      handleSelectReviewRating(rating)
                                    }
                                    disabled={isSavingPendingReview}
                                    aria-label={getRatingLabel(rating)}
                                    title={getRatingLabel(rating)}
                                  >
                                    <div
                                      className={`flex h-[22px] w-[22px] items-center justify-center rounded-full ${faceDesign?.iconWrap ?? getRatingToneClass(rating)}`}
                                    >
                                      <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        {faceDesign?.svg}
                                      </svg>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            <button
                              type="button"
                              className="text-[10px] leading-none text-[var(--sidebar-text-muted)] underline-offset-2 hover:underline disabled:opacity-50"
                              onClick={handleCancelPendingReview}
                              disabled={isSavingPendingReview}
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-0 py-0">
                            {row.isLatestEditable && isEditingLatestReview ? (
                              <div className="inline-grid grid-cols-2 gap-1 place-items-center">
                                {([1, 2, 3, 4] as const).map((rating) => {
                                  const faceDesign = getRatingFaceDesign(rating);
                                  const isSelected =
                                    latestReviewRatingInput === rating;
                                  return (
                                    <button
                                      key={rating}
                                      type="button"
                                      className={`relative z-0 flex h-7 w-7 items-center justify-center rounded-md border bg-white transition-colors disabled:cursor-wait disabled:opacity-50 ${
                                        isSelected
                                          ? "border-slate-900 ring-1 ring-slate-300"
                                          : "border-[var(--surface-border)]"
                                      }`}
                                      onClick={() =>
                                        setLatestReviewRatingInput(rating)
                                      }
                                      disabled={isMutatingLatestReview}
                                      aria-label={getRatingLabel(rating)}
                                      title={getRatingLabel(rating)}
                                    >
                                      <div
                                        className={`flex h-[22px] w-[22px] items-center justify-center rounded-full ${faceDesign?.iconWrap ?? getRatingToneClass(rating)}`}
                                      >
                                        <svg
                                          width="12"
                                          height="12"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          {faceDesign?.svg}
                                        </svg>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : row.ratingFaceDesign ? (
                              <div className="flex items-center justify-center">
                                <div
                                  className={`flex h-6 w-6 items-center justify-center rounded-full ${row.ratingFaceDesign.iconWrap}`}
                                >
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    {row.ratingFaceDesign.svg}
                                  </svg>
                                </div>
                              </div>
                            ) : (
                              <span
                                className={`inline-flex min-w-[2.75rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-medium ${row.ratingToneClass}`}
                              >
                                {row.ratingLabel}
                              </span>
                            )}
                            <span className="text-[9px] leading-none tabular-nums text-[var(--sidebar-text-muted)]">
                              耐性 {row.resistanceScore ?? "-"}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-0.5 whitespace-nowrap text-[var(--sidebar-text)]">
                        {"isPending" in row && row.isPending ? (
                          <div className="flex items-center gap-0">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={pendingReviewDurationInput}
                              onChange={(e) =>
                                setPendingReviewDurationInput(e.target.value)
                              }
                              onFocus={(e) => e.currentTarget.select()}
                              disabled={isSavingPendingReview}
                              className="h-7 rounded border border-[var(--surface-border)] bg-white px-1 text-[11px] tabular-nums outline-none focus:border-[#cfcfcf]"
                              style={{
                                width: getDurationInputWidthCh(
                                  pendingReviewDurationInput,
                                ),
                                minWidth: "1.65rem",
                                fontVariantNumeric: "tabular-nums lining-nums",
                              }}
                              placeholder="-"
                            />
                            <span className="text-[11px] text-[var(--sidebar-text-muted)]">
                              min.
                            </span>
                          </div>
                        ) : row.isLatestEditable && isEditingLatestReview ? (
                          <div className="flex items-center gap-0">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={latestReviewDurationInput}
                              onChange={(e) =>
                                setLatestReviewDurationInput(e.target.value)
                              }
                              onFocus={(e) => e.currentTarget.select()}
                              disabled={isMutatingLatestReview}
                              className="h-7 rounded border border-[var(--surface-border)] bg-white px-1 text-[11px] tabular-nums outline-none focus:border-[#cfcfcf]"
                              style={{
                                width: getDurationInputWidthCh(
                                  latestReviewDurationInput,
                                ),
                                minWidth: "1.65rem",
                                fontVariantNumeric: "tabular-nums lining-nums",
                              }}
                              placeholder="-"
                            />
                            <span className="text-[11px] text-[var(--sidebar-text-muted)]">
                              min.
                            </span>
                          </div>
                        ) : row.editableLogIndex != null &&
                          onUpdateReviewLogDuration ? (
                          <div className="flex items-center gap-0">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={
                                durationDrafts[row.editableLogIndex] ??
                                (row.durationMinutes != null
                                  ? String(row.durationMinutes)
                                  : "")
                              }
                              onChange={(e) =>
                                handleChangeDurationDraft(
                                  row.editableLogIndex as number,
                                  e.target.value,
                                )
                              }
                              onFocus={(e) => e.currentTarget.select()}
                              onBlur={(e) =>
                                handleSaveReviewDuration(
                                  row.editableLogIndex as number,
                                  e.target.value,
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleSaveReviewDuration(
                                    row.editableLogIndex!,
                                    e.currentTarget.value,
                                  );
                                  e.currentTarget.blur();
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  setDurationDrafts((prev) => ({
                                    ...prev,
                                    [row.editableLogIndex!]:
                                      row.durationMinutes != null
                                        ? String(row.durationMinutes)
                                        : "",
                                  }));
                                  e.currentTarget.blur();
                                }
                              }}
                              disabled={
                                isMutatingLatestReview ||
                                durationSavingIndex === row.editableLogIndex
                              }
                              className="h-7 rounded border border-[var(--surface-border)] bg-white px-1 text-[11px] tabular-nums outline-none focus:border-[#cfcfcf]"
                              style={{
                                width: getDurationInputWidthCh(
                                  durationDrafts[row.editableLogIndex] ??
                                    (row.durationMinutes != null
                                      ? String(row.durationMinutes)
                                      : ""),
                                ),
                                minWidth: "1.65rem",
                                fontVariantNumeric: "tabular-nums lining-nums",
                              }}
                              placeholder="-"
                            />
                            <span className="text-[11px] text-[var(--sidebar-text-muted)]">
                              min.
                            </span>
                          </div>
                        ) : (
                          <span className="tabular-nums">{row.durationLabel}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          {canManageLatestReview && latestEditableReview && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--sidebar-border)] bg-white/70 px-3 py-2">
              <p className="text-[11px] leading-5 text-[var(--sidebar-text-muted)]">
                {isEditingLatestReview
                  ? "最新記録を編集中"
                  : `最新記録: ${formatDateLabel(latestEditableReview.reviewedAt)} / ${getRatingLabel(latestEditableReview.rating)}`}
              </p>
              {isEditingLatestReview ? (
                <div className="flex items-center justify-end gap-1">
                  <SurfaceButton
                    type="button"
                    surface="convex"
                    size="xs"
                    className="h-7 px-2"
                    onClick={handleSaveLatestReview}
                    disabled={isMutatingLatestReview}
                  >
                    保存
                  </SurfaceButton>
                  <SurfaceButton
                    type="button"
                    surface="concave"
                    size="xs"
                    className="h-7 px-2"
                    onClick={handleCancelEditLatestReview}
                    disabled={isMutatingLatestReview}
                  >
                    取消
                  </SurfaceButton>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-1">
                  <SurfaceButton
                    type="button"
                    surface="concave"
                    size="xs"
                    className="h-7 px-2"
                    onClick={handleStartEditLatestReview}
                    disabled={
                      Boolean(pendingReviewTimestamp) ||
                      isSavingPendingReview ||
                      isMutatingLatestReview
                    }
                  >
                    編集
                  </SurfaceButton>
                  <SurfaceButton
                    type="button"
                    surface="concave"
                    size="xs"
                    className="h-7 px-2 text-red-700"
                    onClick={handleDeleteLatestReview}
                    disabled={
                      Boolean(pendingReviewTimestamp) ||
                      isSavingPendingReview ||
                      isMutatingLatestReview
                    }
                  >
                    削除
                  </SurfaceButton>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </EmptyMetaPanel>
  );
}

export const CardMetaPanel = memo(
  CardMetaPanelInner,
  areCardMetaPanelPropsEqual,
);
CardMetaPanel.displayName = "CardMetaPanel";


