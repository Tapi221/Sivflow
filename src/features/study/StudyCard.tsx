import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Volume2 } from "@/ui/icons";
import { Flashcard } from "@/components/card/frame/Flashcard";
import type { Card } from "@/types";

type FlashcardCardLike = ComponentProps<typeof Flashcard>["card"];

type StudyPhase = "timing" | "answer";

type PracticeScore = "ok" | "anxious";
type ReviewScore = 0 | 1 | 2 | 3;

type BaseProps = {
  card: Card | null | undefined;
  currentIndex?: number;
  totalCards?: number;

  onToggleUncertainty?: (card: Card) => void;
  onToggleBookmark?: (card: Card) => void;
  onEdit?: (card: Card) => void;

  showHard?: boolean;
  showEasy?: boolean;

  /**
   * 縦ページャから flip を外部トリガーするための整数カウンタ。
   * この値がインクリメントされると handleFlip() が呼ばれる。
   * card 変化で StudyCard が remount されるためリセット不要。
   */
  flipTrigger?: number;
};

type ReviewProps = BaseProps & {
  mode?: "review";
  onResult?: (subjectiveScore: ReviewScore, responseTime: number) => void;
};

type PracticeProps = BaseProps & {
  mode: "practice";
  onResult?: (subjectiveScore: PracticeScore, responseTime: number) => void;
};

type StudyCardProps = ReviewProps | PracticeProps;

type Keyable = {
  id?: string;
  cardId?: string;
  docId?: string;
  uid?: string;
  createdAt?: unknown;
};

const stableKeyPart = (value: unknown) => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object" && value) {
    const obj = value as { toMillis?: () => number; toDate?: () => Date };
    if (typeof obj.toMillis === "function") return String(obj.toMillis());
    if (typeof obj.toDate === "function") return obj.toDate().toISOString();
  }
  return "";
};

const getCardKey = (card: Card) => {
  const k = card as unknown as Keyable;
  const direct =
    k.id ?? k.cardId ?? k.docId ?? k.uid ?? stableKeyPart(k.createdAt);
  return direct && direct.length > 0 ? direct : "card";
};

export default const StudyCard = (props: StudyCardProps) => {
  const { card } = props;

  if (!card) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">学習するカードがありません</p>
      </div>
    );
  }

  // card が切り替わるたびに remount して state を初期化（setState in effect を避ける）
  return <StudyCardInner key={getCardKey(card)} {...props} card={card} />;
};

type InnerProps = Omit<StudyCardProps, "card"> & { card: Card };

const StudyCardInner = (
  {
    card,
    onResult,
    onToggleUncertainty,
    onToggleBookmark,
    onEdit,
    mode = "review",
    showHard = true,
    showEasy = true,
    flipTrigger,
  }: InnerProps
) => {
  const isPracticeMode = mode === "practice";

  const [studyPhase, setStudyPhase] = useState<StudyPhase>("timing");
  const [elapsedTime, setElapsedTime] = useState(0);

  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTiming = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTiming = () => {
    startTimeRef.current = Date.now();
    stopTiming();
    timerRef.current = setInterval(() => {
      const started = startTimeRef.current;
      if (!started) return;
      setElapsedTime(Math.floor((Date.now() - started) / 1000));
    }, 100);
  };

  // mount/unmount: 外部(タイマー)だけ管理。effect 本体で setState はしない。
  useEffect(() => {
    startTiming();
    return () => stopTiming();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emitResult = (score: PracticeScore | ReviewScore) => {
    const responseTime = elapsedTime;

    if (isPracticeMode) {
      (onResult as PracticeProps["onResult"])?.(
        score as PracticeScore,
        responseTime,
      );
    } else {
      (onResult as ReviewProps["onResult"])?.(
        score as ReviewScore,
        responseTime,
      );
    }
  };

  const handleShowAnswer = () => {
    setStudyPhase("answer");
    stopTiming();
  };

  const handleFlip = () => {
    if (studyPhase === "timing") {
      handleShowAnswer();
      return;
    }

    // answer -> timing: イベント内でリセット（effect 内 setState を避ける）
    setStudyPhase("timing");
    setElapsedTime(0);
    startTiming();
  };

  // 縦ページャから Space/Enter でカードをめくるための外部トリガー
  useEffect(() => {
    if (!flipTrigger) return;
    handleFlip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipTrigger]);

  const renderPracticeButtons = () => (
    <div className="reviewRatingBar flex items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <button
        className="w-24 h-20 md:w-28 md:h-24 rounded-2xl bg-white border border-[var(--surface-border)] surface-convex flex flex-col items-center justify-center gap-2 transition-all hover:-translate-y-1 active:scale-95 group"
        onClick={(e) => {
          e.stopPropagation();
          emitResult("anxious");
        }}
      >
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-red-50 face-badge-convex flex items-center justify-center text-[#FF5A65] group-hover:scale-110 transition-transform">
          <svg
            width="18"
            height="18"
            className="md:w-5 md:h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="8" y1="15" x2="16" y2="15" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </div>
        <span className="text-xs md:text-sm font-bold text-slate-600 group-hover:text-[#FF5A65]">
          不安
        </span>
      </button>

      <button
        className="w-24 h-20 md:w-28 md:h-24 rounded-2xl bg-white border border-[var(--surface-border)] surface-convex flex flex-col items-center justify-center gap-2 transition-all hover:-translate-y-1 active:scale-95 group"
        onClick={(e) => {
          e.stopPropagation();
          emitResult("ok");
        }}
      >
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-blue-50 face-badge-convex flex items-center justify-center text-[#00A3FF] group-hover:scale-110 transition-transform">
          <svg
            width="18"
            height="18"
            className="md:w-5 md:h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </div>
        <span className="text-xs md:text-sm font-bold text-slate-600 group-hover:text-[#00A3FF]">
          OK
        </span>
      </button>
    </div>
  );

  const renderReviewButtons = () => (
    <div className="reviewRatingBar flex items-center justify-center gap-2 md:gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <button
        className="w-16 h-20 md:w-20 md:h-24 rounded-2xl bg-white border border-[var(--surface-border)] surface-convex flex flex-col items-center justify-center gap-1 md:gap-2 transition-all hover:-translate-y-1 active:scale-95 group"
        onClick={(e) => {
          e.stopPropagation();
          emitResult(0);
        }}
      >
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-50 face-badge-convex flex items-center justify-center text-[#FF5A65] group-hover:scale-110 transition-transform">
          <svg
            width="18"
            height="18"
            className="md:w-5 md:h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" stroke="none" />
            <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </div>
        <span className="text-[10px] md:text-xs font-bold text-slate-600 group-hover:text-[#FF5A65]">
          忘れた
        </span>
      </button>

      {showHard && (
        <button
          className="w-16 h-20 md:w-20 md:h-24 rounded-2xl bg-white border border-[var(--surface-border)] surface-convex hover:bg-[#FFFBF0] flex flex-col items-center justify-center gap-1 md:gap-2 transition-all hover:-translate-y-1 active:scale-95 group"
          onClick={(e) => {
            e.stopPropagation();
            emitResult(1);
          }}
        >
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-amber-50 face-badge-convex flex items-center justify-center text-[#F9A825] group-hover:scale-110 transition-transform">
            <svg
              width="18"
              height="18"
              className="md:w-5 md:h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="8" y1="15" x2="16" y2="15" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
          <span className="text-[10px] md:text-xs font-bold text-slate-600 group-hover:text-[#F9A825]">
            あいまい
          </span>
        </button>
      )}

      <button
        className="w-16 h-20 md:w-20 md:h-24 rounded-2xl bg-white border border-[var(--surface-border)] surface-convex flex flex-col items-center justify-center gap-1 md:gap-2 transition-all hover:-translate-y-1 active:scale-95 group"
        onClick={(e) => {
          e.stopPropagation();
          emitResult(2);
        }}
      >
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-50 face-badge-convex flex items-center justify-center text-[#00A3FF] group-hover:scale-110 transition-transform">
          <svg
            width="18"
            height="18"
            className="md:w-5 md:h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </div>
        <span className="text-[10px] md:text-xs font-bold text-slate-600 group-hover:text-[#00A3FF]">
          覚えた
        </span>
      </button>

      {showEasy && (
        <button
          className="w-16 h-20 md:w-20 md:h-24 rounded-2xl bg-white border border-[var(--surface-border)] surface-convex hover:bg-[#EEFDF6] flex flex-col items-center justify-center gap-1 md:gap-2 transition-all hover:-translate-y-1 active:scale-95 group"
          onClick={(e) => {
            e.stopPropagation();
            emitResult(3);
          }}
        >
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-emerald-50 face-badge-convex flex items-center justify-center text-[#00B67A] group-hover:scale-110 transition-transform">
            <svg
              width="18"
              height="18"
              className="md:w-5 md:h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 13s1.5 3 4 3 4-3 4-3" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
          <span className="text-[10px] md:text-xs font-bold text-slate-600 group-hover:text-[#00B67A]">
            余裕
          </span>
        </button>
      )}
    </div>
  );

  const flashcardCard = card as unknown as FlashcardCardLike;

  const handleToggleUncertainty = onToggleUncertainty
    ? () => onToggleUncertainty(card)
    : undefined;
  const handleToggleBookmark = onToggleBookmark
    ? () => onToggleBookmark(card)
    : undefined;
  const handleEdit = onEdit ? () => onEdit(card) : undefined;

  const reviewCount = (card as unknown as { reviewCount?: unknown })
    .reviewCount;
  const showReviewCount = typeof reviewCount === "number" && reviewCount >= 0;

  return (
    <div className="reviewStudyCard flex flex-col gap-6 w-full mx-auto max-w-[520px]">
      <div className="reviewCardViewport">
        <div>
          <Flashcard
            card={flashcardCard}
            isFlipped={studyPhase === "answer"}
            onFlip={handleFlip}
            extraHeaderLeft={
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full w-8 h-8 md:w-9 md:h-9 min-w-0 min-h-0 bg-slate-50 text-primary-600 hover:bg-primary-50 hover:text-primary-700"
              >
                <Volume2 className="w-4 h-4 md:w-5 h-5" />
              </Button>
            }
            extraHeaderRight={
              <div className="flex flex-col items-end pointer-events-none mb-2">
                {showReviewCount && (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-slate-400 border-slate-200 bg-slate-50/50 backdrop-blur-sm whitespace-nowrap tabular-nums font-bold"
                  >
                    {reviewCount + 1}回目の復習
                  </Badge>
                )}
                {/* 「次回学習日」バッジは削除 */}
              </div>
            }
            extraFooter={
              studyPhase === "timing" && (
                <div className="text-center">
                  <p className="text-sm text-slate-400 animate-pulse">
                    カードをクリックまたはスワイプして解答を表示
                  </p>
                </div>
              )
            }
            onToggleUncertainty={handleToggleUncertainty}
            onToggleBookmark={handleToggleBookmark}
            onEdit={handleEdit}
          />
        </div>
      </div>

      {studyPhase === "answer" &&
        (isPracticeMode ? renderPracticeButtons() : renderReviewButtons())}
    </div>
  );
};
