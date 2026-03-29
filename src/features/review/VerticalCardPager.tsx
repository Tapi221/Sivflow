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

import { useCallback, useEffect, useRef, useState } from "react";
import { useVerticalCardPager } from "@/hooks/study/useVerticalCardPager";
import { CANONICAL_CARD_WIDTH } from "@/components/card/common/constants";
import { cn } from "@/lib/utils";

// ── レイアウト定数 ──────────────────────────────────────────────────────────
const DEFAULT_CARD_WIDTH = CANONICAL_CARD_WIDTH;
const CARD_GAP = 16; // カード間の縦方向ギャップ (px)
const SCROLL_PADDING = "50vh"; // 先頭・末尾カードを中央に寄せるための余白
const CARD_RADIUS_SM = 32;
const CARD_RADIUS_MD = 40;

function resolveCardBaseRadius(): number {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return CARD_RADIUS_MD;
  }
  return window.matchMedia("(min-width: 768px)").matches
    ? CARD_RADIUS_MD
    : CARD_RADIUS_SM;
}

function cardBorderRadius(cardWidth: number): string {
  // CardFrame は scale で拡縮されるため、外側ラッパーも同じ比率で角丸を追従させる。
  const baseRadius = resolveCardBaseRadius();
  const scaled = (baseRadius * cardWidth) / CANONICAL_CARD_WIDTH;
  return `${Math.round(Math.max(0, scaled))}px`;
}

// ── Props ───────────────────────────────────────────────────────────────────
export type VerticalCardPagerProps<T> = {
  cards: T[];
  /** 外部管理のアクティブインデックス */
  activeIndex: number;
  /** スクロールでアクティブが変わったとき呼ばれる */
  onActiveIndexChange: (idx: number) => void;
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
  /** アクティブ項目の状態強調を表示するか */
  showActiveState?: boolean;
  /** @deprecated showActiveState を使用 */
  showActiveOutline?: boolean;
  /** 行ラッパーの見た目装飾（shadow/opacity）を無効化するか */
  disableItemChrome?: boolean;
  /**
   * activeIndex の前後何枚まで実カードを描画するか。
   * 範囲外は軽量プレースホルダに置き換えてレンダリング負荷を下げる。
   * undefined/null の場合は全カードを描画する。
   */
  renderWindowRadius?: number | null;
  /** プレースホルダの推定高さ(px)を返す関数 */
  getEstimatedHeight?: (card: T, idx: number, isActive: boolean) => number;
  /** レイアウト変更時の再センタリング用シグナル */
  recenterSignal?: number | string;
};

// ── コンポーネント ───────────────────────────────────────────────────────────
export function VerticalCardPager<T>({
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
  showActiveState,
  showActiveOutline,
  disableItemChrome = false,
  renderWindowRadius = null,
  getEstimatedHeight,
  recenterSignal,
}: VerticalCardPagerProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleRangeRafRef = useRef<number | null>(null);
  const visibleRangeRef = useRef<{ start: number; end: number } | null>(null);
  const shouldShowActiveState = showActiveState ?? showActiveOutline ?? true;
  const [visibleRange, setVisibleRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [hasMeasuredVisibleRange, setHasMeasuredVisibleRange] = useState(false);

  const { itemRefs } = useVerticalCardPager({
    count: cards.length,
    activeIndex,
    onActiveIndexChange,
    scrollContainerRef: containerRef,
    onFlip,
    naturalIndexCommitDelayMs,
    freezeActiveIndex,
    recenterSignal,
  });

  const updateVisibleRange = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const top = containerRect.top;
    const bottom = containerRect.bottom;

    let start = -1;
    let end = -1;

    for (let idx = 0; idx < cards.length; idx += 1) {
      const el = itemRefs.current[idx];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < top) continue;
      if (rect.top > bottom) {
        if (start !== -1) break;
        continue;
      }
      if (start === -1) start = idx;
      end = idx;
    }

    const nextRange = start === -1 ? null : { start, end };
    const prevRange = visibleRangeRef.current;
    if (
      prevRange?.start === nextRange?.start &&
      prevRange?.end === nextRange?.end
    ) {
      if (!hasMeasuredVisibleRange) setHasMeasuredVisibleRange(true);
      return;
    }

    visibleRangeRef.current = nextRange;
    setVisibleRange(nextRange);
    if (!hasMeasuredVisibleRange) setHasMeasuredVisibleRange(true);
  }, [cards.length, hasMeasuredVisibleRange, itemRefs]);

  const scheduleVisibleRangeUpdate = useCallback(() => {
    if (visibleRangeRafRef.current != null) return;
    visibleRangeRafRef.current = window.requestAnimationFrame(() => {
      visibleRangeRafRef.current = null;
      updateVisibleRange();
    });
  }, [updateVisibleRange]);

  useEffect(() => {
    scheduleVisibleRangeUpdate();

    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => scheduleVisibleRangeUpdate();
    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => scheduleVisibleRangeUpdate())
        : null;
    observer?.observe(container);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      observer?.disconnect();
      if (visibleRangeRafRef.current != null) {
        window.cancelAnimationFrame(visibleRangeRafRef.current);
        visibleRangeRafRef.current = null;
      }
    };
  }, [cards.length, scheduleVisibleRangeUpdate]);

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
          const withinRenderWindow =
            renderWindowRadius == null
              ? true
              : Math.abs(idx - activeIndex) <= renderWindowRadius;
          const shouldRenderCard =
            !hasMeasuredVisibleRange || withinRenderWindow || isVisibleInViewport;
          const key = getKey ? getKey(card, idx) : idx;
          const width = Math.max(
            1,
            getCardWidth ? getCardWidth(card, idx, isActive) : cardWidth,
          );
          const shouldHighlight = Boolean(
            shouldShowActiveState && !disableItemChrome && isActive,
          );

          return (
            <div
              key={key}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              aria-current={isActive ? "true" : undefined}
              data-card-active={shouldHighlight ? "true" : undefined}
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
                      Math.round(
                        getEstimatedHeight?.(card, idx, isActive) ?? 900,
                      ),
                    )}px`,
                    contentVisibility: "auto",
                    containIntrinsicSize: "900px 1200px",
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
