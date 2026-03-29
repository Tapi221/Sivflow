import { useCallback, useEffect, useRef } from "react";
import { isTypingTarget } from "@/utils/isTypingTarget";

const CARD_STACK_GAP_PX = 16;
const PENDING_SCROLL_RELEASE_SMOOTH_MS = 32;
const PENDING_SCROLL_RELEASE_AUTO_MS = 0;
const PENDING_SCROLL_FALLBACK_MS = 80;

export type UseVerticalCardPagerOptions = {
  /** カード総数 */
  count: number;
  /** 外部管理のアクティブインデックス */
  activeIndex: number;
  /** 自然スクロールでアクティブカードが変わったときに呼ぶ */
  onActiveIndexChange: (idx: number) => void;
  /** スクロールコンテナへの ref */
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  /** Space / Enter で呼ばれる flip コールバック（省略可） */
  onFlip?: () => void;
  /** 自然スクロール時の activeIndex 反映遅延(ms)。0 なら即時反映 */
  naturalIndexCommitDelayMs?: number;
  /** true の間は自然スクロールや矢印操作で activeIndex を変更しない */
  freezeActiveIndex?: boolean;
  /**
   * 最近傍インデックスが変わった直後（React state 更新より前）に呼ばれる即時コールバック。
   * DOM 直接操作など、React 再レンダリングを待たずに実行したい処理に使う。
   */
  onNearestIndexImmediate?: (idx: number) => void;
};

export type UseVerticalCardPagerReturn = {
  /** 各カード要素への ref 配列 */
  itemRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  /** idx のカードを中央にスクロール */
  scrollToIndex: (idx: number, behavior?: ScrollBehavior) => void;
  goNext: () => void;
  goPrev: () => void;
};

export function useVerticalCardPager({
  count,
  activeIndex,
  onActiveIndexChange,
  scrollContainerRef,
  onFlip,
  naturalIndexCommitDelayMs = 0,
  freezeActiveIndex = false,
  onNearestIndexImmediate,
}: UseVerticalCardPagerOptions): UseVerticalCardPagerReturn {
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const lastNearestIndexRef = useRef(Math.max(0, activeIndex));
  const avgItemExtentRef = useRef(860);

  // stale closure 回避: onNearestIndexImmediate を ref で保持
  const onNearestIndexImmediateRef = useRef(onNearestIndexImmediate);
  onNearestIndexImmediateRef.current = onNearestIndexImmediate;

  // プログラマティックスクロール中は自然スクロール判定を止める
  const pendingScrollRef = useRef(false);
  const pendingScrollStartedAtRef = useRef(0);
  const pendingScrollTimerRef = useRef<number | null>(null);

  // 自然スクロール中は nearest index の反映を少し遅延させて
  // 編集モード時の重い再マウント連打を避ける
  const naturalIndexTimerRef = useRef<number | null>(null);
  const queuedNaturalIndexRef = useRef<number | null>(null);

  // stale closure 回避
  const activeIndexRef = useRef(activeIndex);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
    if (Number.isFinite(activeIndex) && activeIndex >= 0) {
      lastNearestIndexRef.current = activeIndex;
    }
  }, [activeIndex]);

  const clampIndex = useCallback(
    (idx: number) => {
      if (count <= 0) return -1;
      if (!Number.isFinite(idx)) return 0;
      return Math.max(0, Math.min(count - 1, Math.trunc(idx)));
    },
    [count],
  );

  const getItemCenterY = useCallback((idx: number): number | null => {
    const el = itemRefs.current[idx];
    if (!el) return null;
    return el.offsetTop + el.offsetHeight / 2;
  }, []);

  const findNearestIndexByCenterY = useCallback(
    (targetCenterY: number): number => {
      if (count <= 0) return -1;

      let low = 0;
      let high = count - 1;
      let bestIdx = clampIndex(lastNearestIndexRef.current);
      if (bestIdx < 0) bestIdx = 0;

      while (low <= high) {
        const mid = (low + high) >> 1;
        const centerY = getItemCenterY(mid);
        if (centerY == null) break;

        bestIdx = mid;
        if (centerY < targetCenterY) {
          low = mid + 1;
        } else if (centerY > targetCenterY) {
          high = mid - 1;
        } else {
          return mid;
        }
      }

      const candidates = [
        bestIdx - 2,
        bestIdx - 1,
        bestIdx,
        bestIdx + 1,
        bestIdx + 2,
      ]
        .map(clampIndex)
        .filter((idx, pos, arr) => idx >= 0 && arr.indexOf(idx) === pos);

      let nearest = bestIdx;
      let nearestDist = Number.POSITIVE_INFINITY;
      for (const idx of candidates) {
        const centerY = getItemCenterY(idx);
        if (centerY == null) continue;
        const dist = Math.abs(centerY - targetCenterY);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = idx;
        }
      }
      return nearest;
    },
    [clampIndex, count, getItemCenterY],
  );

  const clearPendingScrollTimer = useCallback(() => {
    if (pendingScrollTimerRef.current != null) {
      window.clearTimeout(pendingScrollTimerRef.current);
      pendingScrollTimerRef.current = null;
    }
  }, []);

  const clearPendingScrollState = useCallback(() => {
    pendingScrollRef.current = false;
    pendingScrollStartedAtRef.current = 0;
    clearPendingScrollTimer();
  }, [clearPendingScrollTimer]);

  const clearNaturalIndexTimer = useCallback(() => {
    if (naturalIndexTimerRef.current != null) {
      window.clearTimeout(naturalIndexTimerRef.current);
      naturalIndexTimerRef.current = null;
    }
  }, []);

  const flushQueuedNaturalIndex = useCallback(() => {
    const nearestIdx = queuedNaturalIndexRef.current;
    queuedNaturalIndexRef.current = null;
    clearNaturalIndexTimer();

    if (nearestIdx == null || nearestIdx === activeIndexRef.current) return;
    onActiveIndexChange(nearestIdx);
  }, [clearNaturalIndexTimer, onActiveIndexChange]);

  const queueNaturalIndexCommit = useCallback(
    (nearestIdx: number) => {
      if (naturalIndexCommitDelayMs <= 0) {
        queuedNaturalIndexRef.current = nearestIdx;
        flushQueuedNaturalIndex();
        return;
      }

      queuedNaturalIndexRef.current = nearestIdx;
      clearNaturalIndexTimer();
      naturalIndexTimerRef.current = window.setTimeout(() => {
        flushQueuedNaturalIndex();
      }, naturalIndexCommitDelayMs);
    },
    [clearNaturalIndexTimer, flushQueuedNaturalIndex, naturalIndexCommitDelayMs],
  );

  const schedulePendingScrollRelease = useCallback(
    (behavior: ScrollBehavior) => {
      clearPendingScrollTimer();
      pendingScrollTimerRef.current = window.setTimeout(() => {
        pendingScrollRef.current = false;
      pendingScrollStartedAtRef.current = 0;
      pendingScrollTimerRef.current = null;
      }, behavior === "smooth"
        ? PENDING_SCROLL_RELEASE_SMOOTH_MS
        : PENDING_SCROLL_RELEASE_AUTO_MS);
    },
    [clearPendingScrollTimer],
  );

  // idx のカードをコンテナ中央へ寄せる
  const scrollToIndex = useCallback(
    (idx: number, behavior: ScrollBehavior = "smooth") => {
      const container = scrollContainerRef.current;
      const el = itemRefs.current[idx];
      if (!container || !el) return;

      pendingScrollRef.current = true;
      pendingScrollStartedAtRef.current = Date.now();
      clearPendingScrollTimer();
      clearNaturalIndexTimer();
      queuedNaturalIndexRef.current = null;

      const targetTop =
        el.offsetTop - container.clientHeight / 2 + el.offsetHeight / 2;

      const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
      const nextTop = Math.min(Math.max(0, targetTop), maxScrollTop);

      container.scrollTo({
        top: nextTop,
        behavior,
      });

      schedulePendingScrollRelease(behavior);
    },
    [
      clearPendingScrollTimer,
      clearNaturalIndexTimer,
      schedulePendingScrollRelease,
      scrollContainerRef,
    ],
  );

  // 今のスクロール位置から、中央に最も近いカードを求める
  const computeNearestIndex = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (count <= 0) return;
    if (pendingScrollRef.current) {
      const elapsed = Date.now() - pendingScrollStartedAtRef.current;
      if (elapsed <= PENDING_SCROLL_FALLBACK_MS) return;
      clearPendingScrollState();
    }
    if (freezeActiveIndex) return;

    const containerCenterY = container.scrollTop + container.clientHeight / 2;
    const nearestIdx = findNearestIndexByCenterY(containerCenterY);

    if (nearestIdx !== -1) {
      lastNearestIndexRef.current = nearestIdx;
      const nearestEl = itemRefs.current[nearestIdx];
      if (nearestEl) {
        const extent = Math.max(1, nearestEl.offsetHeight + CARD_STACK_GAP_PX);
        avgItemExtentRef.current =
          avgItemExtentRef.current * 0.8 + extent * 0.2;
      }
    }

    if (nearestIdx !== -1 && nearestIdx !== activeIndexRef.current) {
      onNearestIndexImmediateRef.current?.(nearestIdx);
      queueNaturalIndexCommit(nearestIdx);
    }
  }, [
    clearPendingScrollState,
    count,
    findNearestIndexByCenterY,
    freezeActiveIndex,
    queueNaturalIndexCommit,
    scrollContainerRef,
  ]);

  const goNext = useCallback(() => {
    if (freezeActiveIndex) return;
    const next = Math.min(activeIndexRef.current + 1, count - 1);
    if (next === activeIndexRef.current) return;
    clearNaturalIndexTimer();
    queuedNaturalIndexRef.current = null;
    onActiveIndexChange(next);
    scrollToIndex(next, "smooth");
  }, [
    clearNaturalIndexTimer,
    count,
    freezeActiveIndex,
    onActiveIndexChange,
    scrollToIndex,
  ]);

  const goPrev = useCallback(() => {
    if (freezeActiveIndex) return;
    const prev = Math.max(activeIndexRef.current - 1, 0);
    if (prev === activeIndexRef.current) return;
    clearNaturalIndexTimer();
    queuedNaturalIndexRef.current = null;
    onActiveIndexChange(prev);
    scrollToIndex(prev, "smooth");
  }, [
    clearNaturalIndexTimer,
    freezeActiveIndex,
    onActiveIndexChange,
    scrollToIndex,
  ]);

  // 自然スクロール時の active 判定
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const schedule = () => {
      computeNearestIndex();
    };
    const cancelPendingOnUserIntent = () => {
      if (!pendingScrollRef.current) return;
      clearPendingScrollState();
    };
    const handleWheel = () => {
      cancelPendingOnUserIntent();
      schedule();
    };

    // container 自体がスクロールする場合と、祖先がスクロールする場合の両方を捕捉
    container.addEventListener("scroll", schedule, { passive: true });
    container.addEventListener("wheel", handleWheel, { passive: true });
    container.addEventListener("touchstart", cancelPendingOnUserIntent, {
      passive: true,
    });
    container.addEventListener("pointerdown", cancelPendingOnUserIntent, {
      passive: true,
    });
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule, { passive: true });

    // 初期状態でも一度判定
    schedule();

    return () => {
      container.removeEventListener("scroll", schedule);
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", cancelPendingOnUserIntent);
      container.removeEventListener("pointerdown", cancelPendingOnUserIntent);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);

      clearPendingScrollState();
      clearNaturalIndexTimer();
    };
  }, [
    count,
    clearPendingScrollState,
    clearNaturalIndexTimer,
    computeNearestIndex,
    scrollContainerRef,
  ]);

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey) return;

      switch (e.key) {
        case " ":
          if (e.shiftKey) return;
          e.preventDefault();
          onFlip?.();
          break;
        case "Enter":
          onFlip?.();
          break;
        case "ArrowDown":
          e.preventDefault();
          goNext();
          break;
        case "ArrowUp":
          e.preventDefault();
          goPrev();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, onFlip]);

  return {
    itemRefs,
    scrollToIndex,
    goNext,
    goPrev,
  };
}
