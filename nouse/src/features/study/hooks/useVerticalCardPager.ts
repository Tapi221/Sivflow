import { useCallback, useEffect, useRef } from "react";
import { useReviewCardPagerHotkeys } from "@/features/hotkey/useReviewCardPagerHotkeys";



type UseVerticalCardPagerOptions = {
  /** カード総数 */ count: number;
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
type UseVerticalCardPagerReturn = {
  /** 各カード要素への ref 配列 */ itemRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  /** idx のカードを中央にスクロール */
  scrollToIndex: (idx: number, behavior?: ScrollBehavior) => void;
  goNext: () => void;
  goPrev: () => void;
};



const SCROLL_IDLE_COMMIT_DELAY_MS = 110;



const useVerticalCardPager = ({ count, activeIndex, onActiveIndexChange, scrollContainerRef, onFlip, naturalIndexCommitDelayMs = 0, freezeActiveIndex = false, onNearestIndexImmediate }: UseVerticalCardPagerOptions) => {
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const lastNearestIndexRef = useRef(Math.max(0, activeIndex));

  const onNearestIndexImmediateRef = useRef(onNearestIndexImmediate);
  useEffect(() => {
    onNearestIndexImmediateRef.current = onNearestIndexImmediate;
  }, [onNearestIndexImmediate]);

  const naturalIndexTimerRef = useRef<number | null>(null);
  const queuedNaturalIndexRef = useRef<number | null>(null);
  const computeNearestRafRef = useRef<number | null>(null);
  const idleCommitTimerRef = useRef<number | null>(null);

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
        if ((centerY === null || centerY === undefined)) break;

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
        bestIdx - 3,
        bestIdx - 2,
        bestIdx - 1,
        bestIdx,
        bestIdx + 1,
        bestIdx + 2,
        bestIdx + 3,
      ]
        .map(clampIndex)
        .filter((idx, pos, arr) => idx >= 0 && arr.indexOf(idx) === pos);

      let nearest = bestIdx;
      let nearestDist = Number.POSITIVE_INFINITY;
      for (const idx of candidates) {
        const centerY = getItemCenterY(idx);
        if ((centerY === null || centerY === undefined)) continue;
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

  const clearNaturalIndexTimer = useCallback(() => {
    if ((naturalIndexTimerRef.current !== null && naturalIndexTimerRef.current !== undefined)) {
      window.clearTimeout(naturalIndexTimerRef.current);
      naturalIndexTimerRef.current = null;
    }
  }, []);

  const clearComputeNearestRaf = useCallback(() => {
    if ((computeNearestRafRef.current !== null && computeNearestRafRef.current !== undefined)) {
      window.cancelAnimationFrame(computeNearestRafRef.current);
      computeNearestRafRef.current = null;
    }
  }, []);

  const clearIdleCommitTimer = useCallback(() => {
    if ((idleCommitTimerRef.current !== null && idleCommitTimerRef.current !== undefined)) {
      window.clearTimeout(idleCommitTimerRef.current);
      idleCommitTimerRef.current = null;
    }
  }, []);

  const flushQueuedNaturalIndex = useCallback(() => {
    const nearestIdx = queuedNaturalIndexRef.current;
    queuedNaturalIndexRef.current = null;
    clearNaturalIndexTimer();

    if ((nearestIdx === null || nearestIdx === undefined) || nearestIdx === activeIndexRef.current) return;
    onActiveIndexChange(nearestIdx);
  }, [clearNaturalIndexTimer, onActiveIndexChange]);

  const queueNaturalIndexCommit = useCallback(
    (nearestIdx: number) => {
      queuedNaturalIndexRef.current = nearestIdx;
      clearNaturalIndexTimer();

      // 遅延ゼロのときは即時コミット（RAF待ちも入れない）
      if (naturalIndexCommitDelayMs <= 0) {
        flushQueuedNaturalIndex();
        return;
      }

      naturalIndexTimerRef.current = window.setTimeout(() => {
        flushQueuedNaturalIndex();
      }, naturalIndexCommitDelayMs);
    },
    [
      clearNaturalIndexTimer,
      flushQueuedNaturalIndex,
      naturalIndexCommitDelayMs,
    ],
  );

  // idx のカードをコンテナ中央へ寄せる
  const scrollToIndex = useCallback(
    (idx: number, behavior: ScrollBehavior = "smooth") => {
      const container = scrollContainerRef.current;
      const el = itemRefs.current[idx];
      if (!container || !el) return;

      clearNaturalIndexTimer();
      queuedNaturalIndexRef.current = null;

      const targetTop =
        el.offsetTop - container.clientHeight / 2 + el.offsetHeight / 2;

      const maxScrollTop = Math.max(
        0,
        container.scrollHeight - container.clientHeight,
      );
      const nextTop = Math.min(Math.max(0, targetTop), maxScrollTop);

      container.scrollTo({
        top: nextTop,
        behavior,
      });
    },
    [clearNaturalIndexTimer, scrollContainerRef],
  );

  // 今のスクロール位置から、中央に最も近いカードを求める
  const computeNearestIndex = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (count <= 0) return;
    if (freezeActiveIndex) return;

    const containerCenterY = container.scrollTop + container.clientHeight / 2;
    const nearestIdx = findNearestIndexByCenterY(containerCenterY);
    if (nearestIdx === -1) return;

    lastNearestIndexRef.current = nearestIdx;
    if (nearestIdx === activeIndexRef.current) return;

    // active の source of truth は常に viewport center で決める。
    // キーボード/クリック/外部更新は補助トリガーに留め、最終値は中央判定に揃える。
    onNearestIndexImmediateRef.current?.(nearestIdx);
    queueNaturalIndexCommit(nearestIdx);
  }, [
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
    // 直接 active を固定せず、スクロール結果の中央判定に委ねる。
    scrollToIndex(next, "smooth");
  }, [clearNaturalIndexTimer, count, freezeActiveIndex, scrollToIndex]);

  const goPrev = useCallback(() => {
    if (freezeActiveIndex) return;
    const prev = Math.max(activeIndexRef.current - 1, 0);
    if (prev === activeIndexRef.current) return;
    clearNaturalIndexTimer();
    queuedNaturalIndexRef.current = null;
    // 直接 active を固定せず、スクロール結果の中央判定に委ねる。
    scrollToIndex(prev, "smooth");
  }, [clearNaturalIndexTimer, freezeActiveIndex, scrollToIndex]);

  // 自然スクロール時の active 判定
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const schedule = () => {
      clearIdleCommitTimer();
      idleCommitTimerRef.current = window.setTimeout(() => {
        idleCommitTimerRef.current = null;
        computeNearestIndex();
      }, SCROLL_IDLE_COMMIT_DELAY_MS);

      if ((computeNearestRafRef.current !== null && computeNearestRafRef.current !== undefined)) return;
      computeNearestRafRef.current = window.requestAnimationFrame(() => {
        computeNearestRafRef.current = null;
        computeNearestIndex();
      });
    };

    const handleWheel = () => {
      schedule();
    };

    const handleScroll = () => {
      schedule();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    container.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("wheel", handleWheel);

      clearNaturalIndexTimer();
      clearComputeNearestRaf();
      clearIdleCommitTimer();
    };
  }, [
    clearComputeNearestRaf,
    clearIdleCommitTimer,
    clearNaturalIndexTimer,
    computeNearestIndex,
    scrollContainerRef,
  ]);

  useReviewCardPagerHotkeys({
    onFlip,
    onNext: goNext,
    onPrev: goPrev,
  });

  return {
    itemRefs,
    scrollToIndex,
    goNext,
    goPrev,
  };
};



export { useVerticalCardPager };


export type { UseVerticalCardPagerOptions, UseVerticalCardPagerReturn };
