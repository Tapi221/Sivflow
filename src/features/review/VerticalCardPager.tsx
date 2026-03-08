/**
 * VerticalCardPager
 *
 * PC 向け縦スクロール式カードページャ。
 * - 固定幅カラムを画面中央に配置、左右は余白
 * - アクティブカード: 青枠＋影（opacity 1）
 * - 非アクティブ: opacity 0.75 程度
 * - transform による 3D / scale は使わない（物理カード挙動）
 * - キーボード: Space/Enter=flip, ↑/↓=prev/next
 */

import { useRef } from "react";
import { useVerticalCardPager } from "@/hooks/study/useVerticalCardPager";
import { CANONICAL_CARD_WIDTH } from "@/components/card/common/constants";

// ── レイアウト定数 ──────────────────────────────────────────────────────────
const DEFAULT_CARD_WIDTH = CANONICAL_CARD_WIDTH; // カード列の固定幅 (px) = カード設計幅と一致させて青枠を正確に合わせる
const CARD_GAP = 16; // カード間の縦方向ギャップ (px)
const SCROLL_PADDING = "50vh"; // 先頭・末尾カードを中央に寄せるための余白

// ── アクティブ/非アクティブスタイル ──────────────────────────────────────
const ACTIVE_BOX_SHADOW = "0 0 0 2px #3b82f6, 0 12px 40px rgba(0,0,0,0.18)";
const INACTIVE_BOX_SHADOW = "0 2px 10px rgba(0,0,0,0.1)";
/** cardWidth に合わせてスケールした角丸を返す (px 指定で縦横ともに一致) */
function cardBorderRadius(cardWidth: number): string {
  return `${Math.round((40 * cardWidth) / CANONICAL_CARD_WIDTH)}px`;
}
const ACTIVE_OPACITY = 1;
const INACTIVE_OPACITY = 0.75;

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
  /** カードの key を取り出す関数。省略時は idx を使う */
  getKey?: (card: T, idx: number) => string | number;
};

// ── コンポーネント ───────────────────────────────────────────────────────────
export function VerticalCardPager<T>({
  cards,
  activeIndex,
  onActiveIndexChange,
  renderCard,
  onFlip,
  cardWidth = DEFAULT_CARD_WIDTH,
  getKey,
}: VerticalCardPagerProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { itemRefs } = useVerticalCardPager({
    count: cards.length,
    activeIndex,
    onActiveIndexChange,
    scrollContainerRef: containerRef,
    onFlip,
  });

  return (
    // スクロールコンテナ: 親から height: 100% を受け取る前提
    <div
      ref={containerRef}
      style={{
        overflowY: "auto",
        height: "100%",
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
          paddingBlock: SCROLL_PADDING,
          paddingInline: 16,
        }}
      >
        {cards.map((card, idx) => {
          const isActive = idx === activeIndex;
          const key = getKey ? getKey(card, idx) : idx;

          return (
            <div
              key={key}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              aria-current={isActive ? "true" : undefined}
              style={{
                width: cardWidth,
                maxWidth: "100%",
                // アクティブ: 青枠＋濃い影、非アクティブ: 薄い影
                boxShadow: isActive ? ACTIVE_BOX_SHADOW : INACTIVE_BOX_SHADOW,
                borderRadius: cardBorderRadius(cardWidth),
                opacity: isActive ? ACTIVE_OPACITY : INACTIVE_OPACITY,
                transition: "opacity 220ms ease, box-shadow 220ms ease",
                // 非アクティブカードへの誤タップを防ぐ（オプション: コメントアウトで解除）
                // pointerEvents: isActive ? 'auto' : 'none',
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




