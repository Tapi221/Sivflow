import { useCallback, useEffect, useRef } from "react";
import { isTypingTarget } from "@/utils/isTypingTarget";

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
}: UseVerticalCardPagerOptions): UseVerticalCardPagerReturn {
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  // 自然スクロール起因の activeIndex 更新かどうか
  const ioTriggeredRef = useRef(false);

  // プログラマティックスクロール中は自然スクロール判定を止める
  const pendingScrollRef = useRef(false);
  const pendingScrollTimerRef = useRef<number | null>(null);

  // scroll / resize の多重実行防止
  const scrollRafRef = useRef<number | null>(null);

  // stale closure 回避
  const activeIndexRef = useRef(activeIndex);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const clearPendingScrollTimer = useCallback(() => {
    if (pendingScrollTimerRef.current != null) {
      window.clearTimeout(pendingScrollTimerRef.current);
      pendingScrollTimerRef.current = null;
    }
  }, []);

  const schedulePendingScrollRelease = useCallback(
    (behavior: ScrollBehavior) => {
      clearPendingScrollTimer();
      pendingScrollTimerRef.current = window.setTimeout(() => {
        pendingScrollRef.current = false;
        pendingScrollTimerRef.current = null;
      }, behavior === "smooth" ? 160 : 40);
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
      clearPendingScrollTimer();

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
    [clearPendingScrollTimer, schedulePendingScrollRelease, scrollContainerRef],
  );

  // 今のスクロール位置から、中央に最も近いカードを求める
  const computeNearestIndex = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (pendingScrollRef.current) return;

    const containerCenter = container.scrollTop + container.clientHeight / 2;

    let minDist = Infinity;
    let nearestIdx = -1;

    for (let idx = 0; idx < itemRefs.current.length; idx += 1) {
      const el = itemRefs.current[idx];
      if (!el) continue;

      const elCenter = el.offsetTop + el.offsetHeight / 2;
      const dist = Math.abs(elCenter - containerCenter);

      if (dist < minDist) {
        minDist = dist;
        nearestIdx = idx;
      }
    }

    if (nearestIdx !== -1 && nearestIdx !== activeIndexRef.current) {
      ioTriggeredRef.current = true;
      onActiveIndexChange(nearestIdx);
    }
  }, [onActiveIndexChange, scrollContainerRef]);

  const goNext = useCallback(() => {
    const next = Math.min(activeIndexRef.current + 1, count - 1);
    if (next === activeIndexRef.current) return;
    onActiveIndexChange(next);
    scrollToIndex(next, "smooth");
  }, [count, onActiveIndexChange, scrollToIndex]);

  const goPrev = useCallback(() => {
    const prev = Math.max(activeIndexRef.current - 1, 0);
    if (prev === activeIndexRef.current) return;
    onActiveIndexChange(prev);
    scrollToIndex(prev, "smooth");
  }, [onActiveIndexChange, scrollToIndex]);

  // 外部から activeIndex が変わったときに中央へ寄せる
  // 自然スクロール起因の変更では二重スクロールしない
  useEffect(() => {
    if (ioTriggeredRef.current) {
      ioTriggeredRef.current = false;
      return;
    }
    scrollToIndex(activeIndex, "smooth");
  }, [activeIndex, scrollToIndex]);

  // 初回マウント時は即時寄せ
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      scrollToIndex(activeIndex, "auto");
    });
    return () => window.cancelAnimationFrame(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 自然スクロール時の active 判定
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const schedule = () => {
      if (scrollRafRef.current != null) return;

      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;
        computeNearestIndex();
      });
    };

    container.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    // 初期状態でも一度判定
    schedule();

    return () => {
      container.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);

      if (scrollRafRef.current != null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }

      clearPendingScrollTimer();
    };
  }, [count, clearPendingScrollTimer, computeNearestIndex, scrollContainerRef]);

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