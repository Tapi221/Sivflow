/**
 * VerticalCardPager
 *
 * PC 向け縦スクロール式カードページャ。
 * - 固定幅カラムを画面中央に配置、左右は余白
 * - アクティブカード: 控えめな陰影 + 局所アクセント
 * - 非アクティブ: opacity を少し落として主従を分離
 * - transform による 3D / scale は使わない（物理カード挙動）
 * - キーボード: Space/Enter=flip, ↑/↓=prev/next
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useVerticalCardPager } from "@/hooks/study/useVerticalCardPager";
import { CANONICAL_CARD_WIDTH } from "@/components/card/common/constants";
import { cn } from "@/lib/utils";

// ── レイアウト定数 ──────────────────────────────────────────────────────────
const DEFAULT_CARD_WIDTH = CANONICAL_CARD_WIDTH;
const CARD_GAP = 16; // カード間の縦方向ギャップ (px)
const SCROLL_PADDING = "50vh"; // 先頭・末尾カードを中央に寄せるための余白
const VISIBLE_RANGE_OVERSCAN_PX = 2800; // 画面外を先描画して高速スクロール時の遅延を防ぐ
const ACTIVE_INDEX_RENDER_RADIUS = 6; // 可視範囲更新前でも近傍は実描画して取りこぼしを減らす
/** プリローダーが shouldRenderCard と同じ判定範囲を知るためにエクスポートする */
export { ACTIVE_INDEX_RENDER_RADIUS };
const PLACEHOLDER_HEIGHT_PX = 900;
const CARD_RADIUS_SM = 32;
const CARD_RADIUS_MD = 40;

function resolveCardBaseRadius(): number {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return CARD_RADIUS_MD;
  }
  return window.matchMedia("(min-width: 768px)").matches
    ? CARD_RADIUS_MD
    : CARD_RADIUS_SM;
}

// cardWidth → borderRadius 文字列のモジュールレベルキャッシュ。
// 全カードの毎フレームで window.matchMedia を呼ばないようにする。
// width は少数パターン（activePaneWidthPx 固定値）しか取らないため
// キャッシュサイズは実質 1–3 エントリに収まる。
const borderRadiusCache = new Map<number, string>();
// ブレークポイントが変わったらキャッシュを破棄する。
// matchMedia はブラウザ環境にのみ存在するため遅延登録。
if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
  window.matchMedia("(min-width: 768px)").addEventListener("change", () => {
    borderRadiusCache.clear();
  });
}

function cardBorderRadius(cardWidth: number): string {
  const cached = borderRadiusCache.get(cardWidth);
  if (cached !== undefined) return cached;
  // CardFrame は scale で拡縮されるため、外側ラッパーも同じ比率で角丸を追従させる。
  const baseRadius = resolveCardBaseRadius();
  const scaled = (baseRadius * cardWidth) / CANONICAL_CARD_WIDTH;
  const result = `${Math.round(Math.max(0, scaled))}px`;
  borderRadiusCache.set(cardWidth, result);
  return result;
}

// ── Props ───────────────────────────────────────────────────────────────────
export type VerticalCardPagerProps<T> = {
  cards: T[];
  /** 外部管理のアクティブインデックス */
  activeIndex: number;
  /** スクロールでアクティブが変わったとき呼ばれる */
  onActiveIndexChange: (idx: number) => void;
  /**
   * 実際にDOMレンダリングされているインデックス範囲が変化したとき呼ばれる。
   * プリローダーがこの範囲を eager 対象として使うことで、
   * 「描画済みだが未プリロード」のカードが出なくなる。
   */
  onRenderRangeChange?: (range: { start: number; end: number } | null) => void;
  /**
   * 各カードのレンダラー。
   * isActive=true のカードのみ完全インタラクティブにすること。
   */
  renderCard: (card: T, idx: number, isActive: boolean) => React.ReactNode;
  /** Space / Enter キーで呼ばれる flip コールバック */
  onFlip?: () => void;
  /** カード列の幅 (px)。デフォルト 560 */
  cardWidth?: number;
  /** カードごとの幅を動的に決める（指定時は cardWidth より優先） */
  getCardWidth?: (card: T, idx: number, isActive: boolean) => number;
  /** カード列全体の左右余白(px) */
  paddingInlinePx?: number;
  /** カード列全体の上下余白 */
  paddingBlock?: string | number;
  /** カードの key を取り出す関数。省略時は idx を使う */
  getKey?: (card: T, idx: number) => string | number;
  /** 自然スクロール時の activeIndex 反映遅延(ms)。0 なら即時反映 */
  naturalIndexCommitDelayMs?: number;
  /** true の間はスクロールで activeIndex を切り替えない */
  freezeActiveIndex?: boolean;
  /** 行ラッパーの見た目装飾（shadow/opacity）を無効化するか */
  disableItemChrome?: boolean;
  /** true の場合、全カードを常時実描画して仮想化を無効化 */
  disableVirtualization?: boolean;
};

// ── コンポーネント ───────────────────────────────────────────────────────────
/**
 * React.memo でラップしてジェネリック型を維持するパターン。
 * CardViewDesktop が renderRange state 更新で再レンダーしても、
 * VerticalCardPager の props（renderCard, activeIndex 等）が変わっていなければ
 * VerticalCardPager は再レンダーされない。
 */
function VerticalCardPagerFn<T>({
  cards,
  activeIndex,
  onActiveIndexChange,
  renderCard,
  onFlip,
  cardWidth = DEFAULT_CARD_WIDTH,
  getCardWidth,
  paddingInlinePx = 16,
  paddingBlock = SCROLL_PADDING,
  getKey,
  naturalIndexCommitDelayMs = 0,
  freezeActiveIndex = false,
  disableItemChrome = false,
  disableVirtualization = false,
  onRenderRangeChange,
}: VerticalCardPagerProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const avgItemExtentRef = useRef(900);
  const visibleRangeRafRef = useRef<number | null>(null);
  const visibleRangeRef = useRef<{ start: number; end: number } | null>(null);
  /**
   * shouldRenderCard と同じロジック
   *   = visibleRange ∪ [activeIndex ± ACTIVE_INDEX_RENDER_RADIUS]
   * の union をキャッシュして onRenderRangeChange に渡す。
   */
  const effectiveRenderRangeRef = useRef<{
    start: number;
    end: number;
  } | null>(null);
  const [visibleRange, setVisibleRange] = useState<{
    start: number;
    end: number;
  } | null>(null);

  const { itemRefs } = useVerticalCardPager({
    count: cards.length,
    activeIndex,
    onActiveIndexChange,
    scrollContainerRef: containerRef,
    onFlip,
    naturalIndexCommitDelayMs,
    freezeActiveIndex,
  });

  // activeIndex を ref で保持。updateVisibleRange の deps から外すことで、
  // activeIndex 変化のたびに scheduleVisibleRangeUpdate が再生成されず、
  // scroll listener effect の不要な再アタッチを防ぐ。
  const activeIndexRef = useRef(activeIndex);
  const onRenderRangeChangeRef = useRef(onRenderRangeChange);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    onRenderRangeChangeRef.current = onRenderRangeChange;
  }, [onRenderRangeChange]);

  const updateVisibleRange = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (disableVirtualization) {
      visibleRangeRef.current = null;
      effectiveRenderRangeRef.current = null;
      setVisibleRange(null);
      onRenderRangeChangeRef.current?.(null);
      return;
    }

    if (cards.length === 0) {
      visibleRangeRef.current = null;
      effectiveRenderRangeRef.current = null;
      setVisibleRange(null);
      onRenderRangeChangeRef.current?.(null);
      return;
    }

    const top = container.scrollTop - VISIBLE_RANGE_OVERSCAN_PX;
    const bottom =
      container.scrollTop + container.clientHeight + VISIBLE_RANGE_OVERSCAN_PX;
    const estimatedIndex = Math.max(
      0,
      Math.min(
        cards.length - 1,
        Math.round(container.scrollTop / Math.max(1, avgItemExtentRef.current)),
      ),
    );

    const getItemTop = (idx: number): number | null => {
      const el = itemRefs.current[idx];
      if (!el) return null;
      return el.offsetTop;
    };
    const getItemBottom = (idx: number): number | null => {
      const el = itemRefs.current[idx];
      if (!el) return null;
      return el.offsetTop + el.offsetHeight;
    };

    let start = Math.max(0, estimatedIndex - ACTIVE_INDEX_RENDER_RADIUS);

    while (start > 0) {
      const prevBottom = getItemBottom(start - 1);
      if (prevBottom == null || prevBottom < top) break;
      start -= 1;
    }
    while (start < cards.length) {
      const currentBottom = getItemBottom(start);
      if (currentBottom == null) {
        start += 1;
        continue;
      }
      if (currentBottom >= top) break;
      start += 1;
    }

    let nextRange: { start: number; end: number } | null = null;
    if (start < cards.length) {
      let end = Math.max(start, estimatedIndex + ACTIVE_INDEX_RENDER_RADIUS);
      if (end >= cards.length) end = cards.length - 1;

      while (end + 1 < cards.length) {
        const nextTop = getItemTop(end + 1);
        if (nextTop == null || nextTop > bottom) break;
        end += 1;
      }
      while (end >= start) {
        const endTop = getItemTop(end);
        if (endTop != null && endTop <= bottom) break;
        end -= 1;
      }
      if (end >= start) nextRange = { start, end };
    }

    if (nextRange != null) {
      const sampleEl =
        itemRefs.current[Math.min(nextRange.end, activeIndexRef.current)];
      if (sampleEl) {
        const extent = Math.max(1, sampleEl.offsetHeight + CARD_GAP);
        avgItemExtentRef.current =
          avgItemExtentRef.current * 0.8 + extent * 0.2;
      }
    }

    // shouldRenderCard と同じ union:
    //   visibleRange ∪ [activeIndex ± ACTIVE_INDEX_RENDER_RADIUS]
    const currentActiveIndex = activeIndexRef.current;
    const radiusStart = Math.max(
      0,
      currentActiveIndex - ACTIVE_INDEX_RENDER_RADIUS,
    );
    const radiusEnd = Math.min(
      cards.length - 1,
      currentActiveIndex + ACTIVE_INDEX_RENDER_RADIUS,
    );
    const effectiveStart = nextRange
      ? Math.min(nextRange.start, radiusStart)
      : radiusStart;
    const effectiveEnd = nextRange
      ? Math.max(nextRange.end, radiusEnd)
      : radiusEnd;
    const nextEffective = { start: effectiveStart, end: effectiveEnd };

    const prevRange = visibleRangeRef.current;
    const prevEffective = effectiveRenderRangeRef.current;
    if (
      prevRange?.start === nextRange?.start &&
      prevRange?.end === nextRange?.end &&
      prevEffective?.start === nextEffective.start &&
      prevEffective?.end === nextEffective.end
    ) {
      return;
    }

    visibleRangeRef.current = nextRange;
    effectiveRenderRangeRef.current = nextEffective;
    setVisibleRange(nextRange);
    onRenderRangeChangeRef.current?.(nextEffective);
    // activeIndex は activeIndexRef 経由で参照するため deps 不要。
    // 含めると activeIndex 変化のたびに scheduleVisibleRangeUpdate が再生成され、
    // scroll listener effect が detach/attach を繰り返す。
  }, [cards.length, disableVirtualization, itemRefs]);

  const scheduleVisibleRangeUpdate = useCallback(() => {
    if (visibleRangeRafRef.current != null) return;
    visibleRangeRafRef.current = window.requestAnimationFrame(() => {
      visibleRangeRafRef.current = null;
      updateVisibleRange();
    });
  }, [updateVisibleRange]);

  useEffect(() => {
    if (disableVirtualization) return;
    scheduleVisibleRangeUpdate();
  }, [disableVirtualization, scheduleVisibleRangeUpdate]);

  useEffect(() => {
    if (disableVirtualization) {
      visibleRangeRef.current = null;
      effectiveRenderRangeRef.current = null;

      if (visibleRangeRafRef.current != null) {
        window.cancelAnimationFrame(visibleRangeRafRef.current);
        visibleRangeRafRef.current = null;
      }

      window.requestAnimationFrame(() => {
        onRenderRangeChangeRef.current?.(null);
      });
      return;
    }

    scheduleVisibleRangeUpdate();

    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => scheduleVisibleRangeUpdate();
    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", scheduleVisibleRangeUpdate, {
      passive: true,
    });

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => scheduleVisibleRangeUpdate())
        : null;
    observer?.observe(container);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", scheduleVisibleRangeUpdate);
      observer?.disconnect();
      if (visibleRangeRafRef.current != null) {
        window.cancelAnimationFrame(visibleRangeRafRef.current);
        visibleRangeRafRef.current = null;
      }
    };
  }, [cards.length, disableVirtualization, scheduleVisibleRangeUpdate]);

  return (
    // スクロールコンテナ: 親から height: 100% を受け取る前提
    <div
      ref={containerRef}
      style={{
        overflowY: "auto",
        scrollbarGutter: "stable",
        height: "100%",
        position: "relative",
      }}
    >
      {/* カード列 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: CARD_GAP,
          // 先頭・末尾カードが中央に来られるよう上下に余白を確保
          paddingBlock,
          paddingInline: paddingInlinePx,
        }}
      >
        {cards.map((card, idx) => {
          const isActive = idx === activeIndex;
          const isVisibleInViewport =
            visibleRange != null &&
            idx >= visibleRange.start &&
            idx <= visibleRange.end;
          const shouldRenderCard =
            disableVirtualization ||
            isVisibleInViewport ||
            Math.abs(idx - activeIndex) <= ACTIVE_INDEX_RENDER_RADIUS;
          const key = getKey ? getKey(card, idx) : idx;
          const width = Math.max(
            1,
            getCardWidth ? getCardWidth(card, idx, isActive) : cardWidth,
          );
          return (
            <div
              key={key}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              aria-current={isActive ? "true" : undefined}
              data-card-active={isActive ? "true" : undefined}
              data-card-hoverable={disableItemChrome ? undefined : "true"}
              className={cn(
                "card-pager-item",
                disableItemChrome && "card-pager-item--plain",
              )}
              style={{
                width,
                maxWidth: "100%",
                borderRadius: cardBorderRadius(width),
              }}
            >
              {shouldRenderCard ? (
                renderCard(card, idx, isActive)
              ) : (
                <div
                  aria-hidden
                  className="w-full"
                  style={{
                    height: `${Math.max(
                      1,
                      Math.round(PLACEHOLDER_HEIGHT_PX),
                    )}px`,
                    contentVisibility: "auto",
                    // inline は wrapper の width が固定なので auto、
                    // block は実際の placeholder 高さと一致させてレイアウトジャンプを防ぐ。
                    containIntrinsicSize: `auto ${PLACEHOLDER_HEIGHT_PX}px`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const VerticalCardPager = React.memo(
  VerticalCardPagerFn,
) as typeof VerticalCardPagerFn;
