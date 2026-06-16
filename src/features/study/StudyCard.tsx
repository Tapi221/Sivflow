import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@web-renderer/chip/button/button/button";
import { Volume2 } from "@web-renderer/chip/icons";
import { Badge } from "@web-renderer/chip/ui/badge";
import type { ComponentProps } from "react";
import { Flashcard } from "@/components/card/frame/Flashcard";
import type { Card } from "@/types";
import { toIsoStringOrNull } from "@/utils/toMillis";



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
  mode: "review";
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
type InnerProps = Omit<StudyCardProps, "card"> & { card: Card; };



const stableKeyPart = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return toIsoStringOrNull(value) ?? "";
};
const getCardKey = (card: Card): string => {
  const keyable = card as unknown as Keyable;
  const direct =
    keyable.id ??
    keyable.cardId ??
    keyable.docId ??
    keyable.uid ??
    stableKeyPart(keyable.createdAt);

  return direct && direct.length > 0 ? direct : "card";
};



const StudyCard = (props: StudyCardProps) => {
  const { card } = props;

  if (!card) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">学習するカードがありません</p>
      </div>
    );
  }

  return <StudyCardInner key={getCardKey(card)} {...props} card={card} />;
};
const StudyCardInner = ({
  card,
  onResult,
  onToggleUncertainty,
  onToggleBookmark,
  onEdit,
  mode = "review",
  showHard = true,
  showEasy = true,
  flipTrigger,
}: InnerProps) => {
  const isPracticeMode = mode === "practice";

  const [studyPhase, setStudyPhase] = useState<StudyPhase>("timing");
  const [elapsedTime, setElapsedTime] = useState(0);

  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handleFlipRef = useRef<() => void>(() => {});

  const stopTiming = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTiming = useCallback(() => {
    startTimeRef.current = Date.now();
    stopTiming();
    timerRef.current = setInterval(() => {
      const started = startTimeRef.current;
      if (!started) return;
      setElapsedTime(Math.floor((Date.now() - started) / 1000));
    }, 100);
  }, [stopTiming]);

  useEffect(() => {
    startTiming();

    return () => {
      stopTiming();
    };
  }, [startTiming, stopTiming]);

  const emitResult = useCallback(
    (score: PracticeScore | ReviewScore) => {
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
    },
    [elapsedTime, isPracticeMode, onResult],
  );

  const handleShowAnswer = useCallback(() => {
    setStudyPhase("answer");
    stopTiming();
  }, [stopTiming]);

  const handleFlip = useCallback(() => {
    if (studyPhase === "timing") {
      handleShowAnswer();
      return;
    }

    setStudyPhase("timing");
    setElapsedTime(0);
    startTiming();
  }, [handleShowAnswer, startTiming, studyPhase]);

  useEffect(() => {
    handleFlipRef.current = handleFlip;
  }, [handleFlip]);

  useEffect(() => {
    if (!flipTrigger) return;

    const rafId = window.requestAnimationFrame(() => {
      handleFlipRef.current();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [flipTrigger]);

  const renderPracticeButtons = () => (
    <div className="reviewRatingBar flex animate-in items-center justify-center gap-3 fade-in slide-in-from-bottom-4 duration-300">
      <button
        className="group flex h-20 w-24 flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--surface-border)] bg-white surface-convex transition-all hover:-translate-y-1 active:scale-95 md:h-24 md:w-28"
        onClick={(event) => {
          event.stopPropagation();
          emitResult("anxious");
        }}
      >
        <div className="face-badge-convex flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-[#FF5A65] transition-transform group-hover:scale-110 md:h-10 md:w-10">
          <svg
            width="18"
            height="18"
            className="md:h-5 md:w-5"
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
        <span className="text-xs font-bold text-slate-600 group-hover:text-[#FF5A65] md:text-sm">
          不安
        </span>
      </button>
      <button
        className="group flex h-20 w-24 flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--surface-border)] bg-white surface-convex transition-all hover:-translate-y-1 active:scale-95 md:h-24 md:w-28"
        onClick={(event) => {
          event.stopPropagation();
          emitResult("ok");
        }}
      >
        <div className="face-badge-convex flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-[#00A3FF] transition-transform group-hover:scale-110 md:h-10 md:w-10">
          <svg
            width="18"
            height="18"
            className="md:h-5 md:w-5"
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
        <span className="text-xs font-bold text-slate-600 group-hover:text-[#00A3FF] md:text-sm">
          OK
        </span>
      </button>
    </div>
  );

  const renderReviewButtons = () => (
    <div className="reviewRatingBar flex animate-in items-center justify-center gap-2 fade-in slide-in-from-bottom-4 duration-300 md:gap-3">
      <button
        className="group flex h-20 w-16 flex-col items-center justify-center gap-1 rounded-2xl border border-[var(--surface-border)] bg-white surface-convex transition-all hover:-translate-y-1 active:scale-95 md:h-24 md:w-20 md:gap-2"
        onClick={(event) => {
          event.stopPropagation();
          emitResult(0);
        }}
      >
        <div className="face-badge-convex flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-[#FF5A65] transition-transform group-hover:scale-110 md:h-10 md:w-10">
          <svg
            width="18"
            height="18"
            className="md:h-5 md:w-5"
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
        <span className="text-xs font-bold text-slate-600 group-hover:text-[#FF5A65] md:text-xs">
          忘れた
        </span>
      </button>

      {showHard && (
        <button
          className="group flex h-20 w-16 flex-col items-center justify-center gap-1 rounded-2xl border border-[var(--surface-border)] bg-white surface-convex transition-all hover:-translate-y-1 hover:bg-[#FFFBF0] active:scale-95 md:h-24 md:w-20 md:gap-2"
          onClick={(event) => {
            event.stopPropagation();
            emitResult(1);
          }}
        >
          <div className="face-badge-convex flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-[#F9A825] transition-transform group-hover:scale-110 md:h-10 md:w-10">
            <svg
              width="18"
              height="18"
              className="md:h-5 md:w-5"
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
          <span className="text-xs font-bold text-slate-600 group-hover:text-[#F9A825] md:text-xs">
            あいまい
          </span>
        </button>
      )}

      <button
        className="group flex h-20 w-16 flex-col items-center justify-center gap-1 rounded-2xl border border-[var(--surface-border)] bg-white surface-convex transition-all hover:-translate-y-1 active:scale-95 md:h-24 md:w-20 md:gap-2"
        onClick={(event) => {
          event.stopPropagation();
          emitResult(2);
        }}
      >
        <div className="face-badge-convex flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-[#00A3FF] transition-transform group-hover:scale-110 md:h-10 md:w-10">
          <svg
            width="18"
            height="18"
            className="md:h-5 md:w-5"
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
        <span className="text-xs font-bold text-slate-600 group-hover:text-[#00A3FF] md:text-xs">
          覚えた
        </span>
      </button>

      {showEasy && (
        <button
          className="group flex h-20 w-16 flex-col items-center justify-center gap-1 rounded-2xl border border-[var(--surface-border)] bg-white surface-convex transition-all hover:-translate-y-1 hover:bg-[#EEFDF6] active:scale-95 md:h-24 md:w-20 md:gap-2"
          onClick={(event) => {
            event.stopPropagation();
            emitResult(3);
          }}
        >
          <div className="face-badge-convex flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-[#00B67A] transition-transform group-hover:scale-110 md:h-10 md:w-10">
            <svg
              width="18"
              height="18"
              className="md:h-5 md:w-5"
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
          <span className="text-xs font-bold text-slate-600 group-hover:text-[#00B67A] md:text-xs">
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

  const reviewCount = (card as unknown as { reviewCount?: unknown; })
    .reviewCount;
  const showReviewCount = typeof reviewCount === "number" && reviewCount >= 0;

  return (
    <div className="reviewStudyCard mx-auto flex w-full max-w-96 flex-col gap-6">
      <div className="reviewCardViewport">
        <Flashcard
          card={flashcardCard}
          isFlipped={studyPhase === "answer"}
          onFlip={handleFlip}
          extraHeaderLeft={
            <Button
              size="icon"
              variant="ghost"
              className="h-8 min-h-0 w-8 min-w-0 rounded-full bg-slate-50 text-primary-600 hover:bg-primary-50 hover:text-primary-700 md:h-9 md:w-9"
            >
              <Volume2 className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          }
          extraHeaderRight={
            <div className="pointer-events-none mb-2 flex flex-col items-end">
              {showReviewCount && (
                <Badge
                  variant="outline"
                  className="whitespace-nowrap bg-slate-50/50 text-xs font-bold tabular-nums text-slate-400 backdrop-blur-sm border-slate-200"
                >
                  {reviewCount + 1}回目の復習
                </Badge>
              )}
            </div>
          }
          extraFooter={
            studyPhase === "timing" && (
              <div className="text-center">
                <p className="animate-pulse text-sm text-slate-400">
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

      {studyPhase === "answer" &&
        (isPracticeMode ? renderPracticeButtons() : renderReviewButtons())}
    </div>
  );
};



export default StudyCard;


export type { StudyCardProps };
