/**
 * CardCarousel3D — scroll-snap ベースの物理カードカルーセル
 *
 * 設計方針:
 *  - scroll-snap-type: x mandatory でネイティブスクロール+中央吸着
 *  - コンテナ(ステージ)高さは activeCard の実測値に追従 (height transition)
 *  - スクロール中はステージ高さを変えない (jitter 防止)
 *  - スクロール停止判定: 120ms デバウンス
 *  - activeCard の高さ変化は ResizeObserver で監視 (画像ロード等に対応)
 *  - 左右カードは opacity/scale で "peek" 演出、pointer-events: none で誤タップ防止
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Flashcard } from "@/components/card/frame/Flashcard";
import { MobileScalableCard } from "@/components/card/frame/MobileScalableCard";
import {
  CARD_BASE_WIDTH,
  CARD_DISPLAY_SCALE,
  CARD_SAFE_PADDING_PX,
} from "@/components/card/common/constants";

const CARD_DISPLAY_WIDTH = Math.round(CARD_BASE_WIDTH * CARD_DISPLAY_SCALE);
import type { Card } from "@/types";

// ── レイアウト定数 (ここを変えれば見た目を調整できる) ──────────────────
/** カードスロットの固定横幅 (px) */
const CARD_WIDTH = 560;
/** 隣カードの見える幅 (px) */
const PEEK = 60;
/** カード間ギャップ (px) */
const GAP = 20;
/** ステージ(クリップ領域)の横幅 */
const STAGE_WIDTH = CARD_WIDTH + 2 * (GAP + PEEK);

// ── タイミング定数 ───────────────────────────────────────────────────────
/** スクロール停止と見なすまでの無操作時間 (ms) */
const SCROLL_DEBOUNCE_MS = 120;
/** ステージ高さ変更のトランジション時間 (ms) */
const HEIGHT_TRANSITION_MS = 200;

// ── 型 ──────────────────────────────────────────────────────────────────
type FlashcardCardLike = React.ComponentProps<typeof Flashcard>["card"];

export type CardCarousel3DProps = {
  cards: Card[];
  /**
   * 外部からの同期インデックス。
   * 例: 回答ボタンを押したあとに StudyMode から受け取る現在位置。
   * このプロパティが変化したときにカルーセルが即座にジャンプする。
   */
  syncIndex: number;
  /** ユーザーが手動ナビゲートしたときに呼ばれる */
  onIndexChange?: (idx: number) => void;
  /** アクティブカードのレンダラー (StudyCard など) */
  renderCenter: (card: Card, idx: number) => React.ReactNode;
  /** 非アクティブカードのレンダラー。省略時は Flashcard front のみ */
  renderPreview?: (card: Card) => React.ReactNode;
};

// ── デフォルトプレビュー ─────────────────────────────────────────────────
function DefaultPreview({ card }: { card: Card }) {
  return (
    <MobileScalableCard
      cardDesignWidth={CARD_DISPLAY_WIDTH}
      safePadding={CARD_SAFE_PADDING_PX}
    >
      <Flashcard
        card={card as unknown as FlashcardCardLike}
        isFlipped={false}
        previewMode={true}
      />
    </MobileScalableCard>
  );
}

// ── メインコンポーネント ──────────────────────────────────────────────────
export function CardCarousel3D({
  cards,
  syncIndex,
  onIndexChange,
  renderCenter,
  renderPreview,
}: CardCarousel3DProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // 各カードスロットへの ref (高さ計測用)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [activeIdx, setActiveIdx] = useState(syncIndex);
  // ステージ高さ。undefined = まだ計測前 (トランジション無効)
  const [stageHeight, setStageHeight] = useState<number | undefined>(undefined);

  const isScrollingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // ── スクロール位置 → インデックス変換 ──────────────────────────────────
  const scrollLeftForIndex = (idx: number) => idx * (CARD_WIDTH + GAP);

  // ── スクロールトラックをインデックスにジャンプ ───────────────────────────
  const scrollToIndex = useCallback(
    (idx: number, behavior: ScrollBehavior = "smooth") => {
      trackRef.current?.scrollTo({ left: scrollLeftForIndex(idx), behavior });
    },
    [],
  );

  // ── 高さ計測 & ステージ高さ更新 (スクロール中は呼ばない) ────────────────
  const updateStageHeight = useCallback((idx: number) => {
    if (isScrollingRef.current) return;
    const el = itemRefs.current[idx];
    if (!el) return;
    const h = el.getBoundingClientRect().height;
    if (h > 0) setStageHeight(h);
  }, []);

  // ── 初期マウント: syncIndex 位置にジャンプして高さを確定 ────────────────
  useLayoutEffect(() => {
    scrollToIndex(syncIndex, "instant");
    // rAF で DOM 更新後に高さ計測
    const id = requestAnimationFrame(() => updateStageHeight(syncIndex));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── syncIndex が外から変化したとき (回答後など) ─────────────────────────
  useLayoutEffect(() => {
    if (syncIndex === activeIdx) return;
    scrollToIndex(syncIndex, "instant");
    setActiveIdx(syncIndex);
  }, [syncIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── activeIdx が変わったら高さを更新 ────────────────────────────────────
  useEffect(() => {
    // rAF: 新しいカードの render が終わってから計測
    const id = requestAnimationFrame(() => updateStageHeight(activeIdx));
    return () => cancelAnimationFrame(id);
  }, [activeIdx, updateStageHeight]);

  // ── activeIdx の ResizeObserver (画像ロード等に対応) ────────────────────
  useEffect(() => {
    resizeObserverRef.current?.disconnect();
    const el = itemRefs.current[activeIdx];
    if (!el) return;
    const ro = new ResizeObserver(() => updateStageHeight(activeIdx));
    ro.observe(el);
    resizeObserverRef.current = ro;
    return () => ro.disconnect();
  }, [activeIdx, updateStageHeight]);

  // ── フォーカス管理 ───────────────────────────────────────────────────────
  useLayoutEffect(() => {
    stageRef.current?.focus({ preventScroll: true });
  }, [activeIdx]);

  // ── スクロールイベント ────────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    isScrollingRef.current = true;
    clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      const track = trackRef.current;
      if (!track) return;

      // 最近傍インデックスを確定
      const nearest = Math.round(track.scrollLeft / (CARD_WIDTH + GAP));
      const clamped = Math.max(0, Math.min(cards.length - 1, nearest));

      setActiveIdx((prev) => {
        if (prev !== clamped) onIndexChange?.(clamped);
        return clamped;
      });
      // スクロール停止後に高さ更新
      updateStageHeight(clamped);
    }, SCROLL_DEBOUNCE_MS);
  }, [cards.length, onIndexChange, updateStageHeight]);

  // ── ナビゲーション ────────────────────────────────────────────────────────
  const goPrev = useCallback(() => {
    if (activeIdx > 0) scrollToIndex(activeIdx - 1);
  }, [activeIdx, scrollToIndex]);

  const goNext = useCallback(() => {
    if (activeIdx < cards.length - 1) scrollToIndex(activeIdx + 1);
  }, [activeIdx, cards.length, scrollToIndex]);

  // ── キーボード ────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    },
    [goPrev, goNext],
  );

  // ── カード数が 0 のとき ───────────────────────────────────────────────────
  if (cards.length === 0) return null;

  const resolvePreview = (card: Card) =>
    renderPreview ? renderPreview(card) : <DefaultPreview card={card} />;

  return (
    <div
      style={{
        width: STAGE_WIDTH,
        maxWidth: "100vw",
        margin: "0 auto",
        position: "relative",
      }}
      aria-label={`カード ${activeIdx + 1} / ${cards.length}`}
    >
      {/* ── ステージ: クリップ + 高さ管理 ─────────────────────────────── */}
      <div
        ref={stageRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{
          overflow: "hidden",
          height: stageHeight,
          // 初回計測前はトランジション無効 (0→実高さ のアニメを防ぐ)
          transition:
            stageHeight !== undefined
              ? `height ${HEIGHT_TRANSITION_MS}ms ease`
              : undefined,
          outline: "none",
        }}
      >
        {/* ── スクロールトラック ─────────────────────────────────────── */}
        <div
          ref={trackRef}
          onScroll={handleScroll}
          style={{
            display: "flex",
            gap: GAP,
            // padding-inline で最初/最後カードがステージ中央に吸着できるようにする
            paddingInline: PEEK + GAP,
            overflowX: "scroll",
            overflowY: "visible",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none", // Firefox
            alignItems: "flex-start", // 各カードが自然な高さを保つ
          }}
        >
          {cards.map((card, idx) => {
            const isActive = idx === activeIdx;
            const isNear = Math.abs(idx - activeIdx) <= 1; // active ± 1 のみ描画優先

            return (
              <div
                key={(card as { id?: string }).id ?? idx}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                aria-hidden={!isActive}
                style={{
                  flexShrink: 0,
                  width: CARD_WIDTH,
                  scrollSnapAlign: "center",
                  // スクロール中にアクティブ判定が遅れても見た目は CSS transition で補う
                  opacity: isActive ? 1 : 0.5,
                  transform: isActive ? "scale(1)" : "scale(0.92)",
                  transition: "opacity 200ms ease, transform 200ms ease",
                  pointerEvents: isActive ? "auto" : "none",
                  // スクロール外のカードは content-visibility で描画コスト軽減
                  // (仮想化の足がかり — 現状は全描画)
                  contentVisibility: isNear ? "visible" : "auto",
                }}
              >
                {isActive ? renderCenter(card, idx) : resolvePreview(card)}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Prev / Next ボタン ─────────────────────────────────────────── */}
      <NavButton direction="prev" onClick={goPrev} disabled={activeIdx === 0} />
      <NavButton
        direction="next"
        onClick={goNext}
        disabled={activeIdx === cards.length - 1}
      />
    </div>
  );
}

// ── Prev/Next ボタン ───────────────────────────────────────────────────────
function NavButton({
  direction,
  onClick,
  disabled,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
}) {
  const isPrev = direction === "prev";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={isPrev ? "前のカード" : "次のカード"}
      style={{
        position: "absolute",
        top: "50%",
        [isPrev ? "left" : "right"]: -48,
        transform: "translateY(-50%)",
        width: 40,
        height: 40,
        borderRadius: "50%",
        border: "1px solid rgba(0,0,0,0.15)",
        background: "rgba(255,255,255,0.9)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.3 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 20,
        transition: "opacity 150ms",
        zIndex: 10,
      }}
    >
      {isPrev ? "‹" : "›"}
    </button>
  );
}




