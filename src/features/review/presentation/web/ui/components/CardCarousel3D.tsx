import { useCallback, useLayoutEffect, useState } from "react";

import { type Card } from "@/types";
import {
  canGoToNextCardCarouselItem,
  canGoToPreviousCardCarouselItem,
  clampCardCarouselIndex,
  isNearCardCarouselItem,
  shouldNotifyCardCarouselIndexChange,
} from "@/features/review/domain/cardCarousel3D";
import { useCardCarousel3DWebBridge } from "@/features/review/infra/web/useCardCarousel3DWebBridge";

const CARD_WIDTH = 560;
const PEEK = 60;
const GAP = 20;
const STAGE_WIDTH = CARD_WIDTH + 2 * (GAP + PEEK);
const PREVIEW_RENDER_RADIUS = 1;
const SCROLL_DEBOUNCE_MS = 120;
const HEIGHT_TRANSITION_MS = 200;

export type CardCarousel3DProps = {
  cards: Card[];
  syncIndex: number;
  onIndexChange?: (idx: number) => void;
  renderCenter: (card: Card, idx: number) => React.ReactNode;
  renderPreview: (card: Card, idx: number) => React.ReactNode;
};

export const CardCarousel3D = ({
  cards,
  syncIndex,
  onIndexChange,
  renderCenter,
  renderPreview,
}: CardCarousel3DProps) => {
  const initialIndex = clampCardCarouselIndex(syncIndex, cards.length);

  return (
    <CardCarousel3DInner
      key={`${cards.length}:${initialIndex}`}
      cards={cards}
      initialIndex={initialIndex}
      onIndexChange={onIndexChange}
      renderCenter={renderCenter}
      renderPreview={renderPreview}
    />
  );
};

const CardCarousel3DInner = ({
  cards,
  initialIndex,
  onIndexChange,
  renderCenter,
  renderPreview,
}: {
  cards: Card[];
  initialIndex: number;
  onIndexChange?: (idx: number) => void;
  renderCenter: (card: Card, idx: number) => React.ReactNode;
  renderPreview: (card: Card, idx: number) => React.ReactNode;
}) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const handleSettledIndexChange = useCallback(
    (nextIndex: number) => {
      setActiveIndex((previousIndex) => {
        if (
          shouldNotifyCardCarouselIndexChange({
            nextIndex,
            previousIndex,
          })
        ) {
          onIndexChange?.(nextIndex);
        }

        return nextIndex;
      });
    },
    [onIndexChange],
  );

  const {
    handleScroll,
    isScrolling,
    itemRefs,
    scrollToIndex,
    stageHeight,
    stageRef,
    trackRef,
    updateStageHeight,
  } = useCardCarousel3DWebBridge({
    activeIndex,
    itemCount: cards.length,
    itemSpan: CARD_WIDTH + GAP,
    scrollDebounceMs: SCROLL_DEBOUNCE_MS,
    onSettledIndexChange: handleSettledIndexChange,
  });

  useLayoutEffect(() => {
    if (cards.length === 0) {
      return;
    }

    scrollToIndex(initialIndex, "instant");

    const id = requestAnimationFrame(() => updateStageHeight(initialIndex));
    return () => cancelAnimationFrame(id);
  }, [cards.length, initialIndex, scrollToIndex, updateStageHeight]);

  const goPrev = useCallback(() => {
    if (!canGoToPreviousCardCarouselItem(activeIndex)) {
      return;
    }

    const nextIndex = activeIndex - 1;
    scrollToIndex(nextIndex);
    handleSettledIndexChange(nextIndex);
  }, [activeIndex, handleSettledIndexChange, scrollToIndex]);

  const goNext = useCallback(() => {
    if (!canGoToNextCardCarouselItem(activeIndex, cards.length)) {
      return;
    }

    const nextIndex = activeIndex + 1;
    scrollToIndex(nextIndex);
    handleSettledIndexChange(nextIndex);
  }, [activeIndex, cards.length, handleSettledIndexChange, scrollToIndex]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    },
    [goNext, goPrev],
  );

  if (cards.length === 0) {
    return null;
  }

  return (
    <div
      ref={stageRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{
        width: STAGE_WIDTH,
        maxWidth: "100vw",
        margin: "0 auto",
        position: "relative",
      }}
      aria-label={`カード ${activeIndex + 1} / ${cards.length}`}
    >
      <div
        style={{
          overflow: "hidden",
          height: stageHeight,
          transition:
            stageHeight !== undefined
              ? `height ${HEIGHT_TRANSITION_MS}ms ease`
              : undefined,
          outline: "none",
        }}
      >
        <div
          ref={trackRef}
          onScroll={handleScroll}
          style={{
            display: "flex",
            gap: GAP,
            paddingInline: PEEK + GAP,
            overflowX: "scroll",
            overflowY: "visible",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            alignItems: "flex-start",
          }}
        >
          {cards.map((card, idx) => {
            const isActive = idx === activeIndex;
            const isNear = isNearCardCarouselItem({
              activeIndex,
              targetIndex: idx,
              radius: PREVIEW_RENDER_RADIUS,
            });
            const shouldRenderCard = isScrolling || isActive || isNear;

            return (
              <div
                key={(card as { id?: string }).id ?? idx}
                ref={(element) => {
                  itemRefs.current[idx] = element;
                }}
                aria-hidden={!isActive}
                style={{
                  flexShrink: 0,
                  width: CARD_WIDTH,
                  scrollSnapAlign: "center",
                  opacity: isActive ? 1 : 0.5,
                  transform: isActive ? "scale(1)" : "scale(0.92)",
                  transition: "opacity 200ms ease, transform 200ms ease",
                  pointerEvents: isActive ? "auto" : "none",
                  contentVisibility: isNear ? "visible" : "auto",
                }}
              >
                {shouldRenderCard ? (
                  isActive ? (
                    renderCenter(card, idx)
                  ) : (
                    renderPreview(card, idx)
                  )
                ) : (
                  <div
                    aria-hidden
                    className="w-full"
                    style={{
                      height: `${Math.max(520, Math.round(stageHeight ?? 720))}px`,
                      contentVisibility: "auto",
                      containIntrinsicSize: "720px 1200px",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <NavButton
        direction="prev"
        onClick={goPrev}
        disabled={!canGoToPreviousCardCarouselItem(activeIndex)}
      />
      <NavButton
        direction="next"
        onClick={goNext}
        disabled={!canGoToNextCardCarouselItem(activeIndex, cards.length)}
      />
    </div>
  );
};

const NavButton = ({
  direction,
  onClick,
  disabled,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
}) => {
  const isPrev = direction === "prev";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={isPrev ? "前のカード" : "次のカード"}
      style={{
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        [isPrev ? "left" : "right"]: 0,
        width: 36,
        height: 36,
        borderRadius: "9999px",
        border: "1px solid rgba(148, 163, 184, 0.35)",
        background: "rgba(15, 23, 42, 0.64)",
        color: "white",
        opacity: disabled ? 0.3 : 0.92,
        cursor: disabled ? "default" : "pointer",
        backdropFilter: "blur(8px)",
      }}
    >
      {isPrev ? "‹" : "›"}
    </button>
  );
};
