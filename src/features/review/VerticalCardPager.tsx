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

import { useRef } from "react";
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
}: VerticalCardPagerProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldShowActiveState = showActiveState ?? showActiveOutline ?? true;

  const { itemRefs } = useVerticalCardPager({
    count: cards.length,
    activeIndex,
    onActiveIndexChange,
    scrollContainerRef: containerRef,
    onFlip,
    naturalIndexCommitDelayMs,
    freezeActiveIndex,
  });

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
              {renderCard(card, idx, isActive)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
