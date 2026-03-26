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

import { useCallback, useLayoutEffect, useRef } from "react";
import { useVerticalCardPager } from "@/hooks/study/useVerticalCardPager";
import { CANONICAL_CARD_WIDTH } from "@/components/card/common/constants";

// ── レイアウト定数 ──────────────────────────────────────────────────────────
const DEFAULT_CARD_WIDTH = CANONICAL_CARD_WIDTH; // カード列の固定幅 (px) = カード設計幅と一致させて青枠を正確に合わせる
const CARD_GAP = 16; // カード間の縦方向ギャップ (px)
const SCROLL_PADDING = "50vh"; // 先頭・末尾カードを中央に寄せるための余白

// アクティブ強調（カルーセル風のフォーカス感）
const ACTIVE_BOX_SHADOW = "0 10px 30px rgba(15,23,42,0.16)";
const INACTIVE_BOX_SHADOW = "0 2px 10px rgba(15,23,42,0.08)";
function cardBorderRadius(cardWidth: number): string {
  // 青枠がカード本体より丸くならないよう、角丸は 40px を上限にする。
  const scaled = (40 * cardWidth) / CANONICAL_CARD_WIDTH;
  return `${Math.round(Math.min(40, Math.max(0, scaled)))}px`;
}
const ACTIVE_OPACITY = 1;
const INACTIVE_OPACITY = 0.78;

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
  /** アクティブ項目の外枠青線を表示するか */
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
  showActiveOutline = true,
  disableItemChrome = false,
}: VerticalCardPagerProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const outlineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 青枠を React の再レンダリングを待たずに直接 DOM 更新する
  const applyOutline = useCallback((idx: number) => {
    outlineRefs.current.forEach((el, i) => {
      if (!el) return;
      el.style.display = i === idx ? "block" : "none";
    });
  }, []);

  const { itemRefs } = useVerticalCardPager({
    count: cards.length,
    activeIndex,
    onActiveIndexChange,
    scrollContainerRef: containerRef,
    onFlip,
    naturalIndexCommitDelayMs,
    freezeActiveIndex,
    onNearestIndexImmediate: showActiveOutline ? applyOutline : undefined,
  });

  // activeIndex が外部から変わった場合（矢印キー・プログラム遷移）にも同期
  useLayoutEffect(() => {
    if (showActiveOutline) applyOutline(activeIndex);
  }, [activeIndex, showActiveOutline, applyOutline]);

  return (
    // スクロールコンテナ: 親から height: 100% を受け取る前提
    <div
      ref={containerRef}
      style={{
        overflowY: "auto",
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
          const itemBoxShadow = disableItemChrome
            ? "none"
            : isActive
              ? ACTIVE_BOX_SHADOW
              : INACTIVE_BOX_SHADOW;
          const itemOpacity = disableItemChrome
            ? 1
            : isActive
              ? ACTIVE_OPACITY
              : INACTIVE_OPACITY;

          return (
            <div
              key={key}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              aria-current={isActive ? "true" : undefined}
              className="relative"
              style={{
                width,
                maxWidth: "100%",
                boxShadow: itemBoxShadow,
                borderRadius: cardBorderRadius(width),
                overflow: "visible",
                opacity: itemOpacity,
                transition: "opacity 180ms ease, box-shadow 180ms ease",
              }}
            >
              {renderCard(card, idx, isActive)}
              {showActiveOutline && (
                <div
                  ref={(el) => { outlineRefs.current[idx] = el; }}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 border-2 border-[#3b82f6]"
                  style={{ borderRadius: "inherit", display: isActive ? "block" : "none" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
