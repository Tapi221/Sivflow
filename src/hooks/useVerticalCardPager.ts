/**
 * useVerticalCardPager
 *
 * 縦スクロール式カードページャの共通ロジック。
 * - scrollIntoView({ block: 'center' }) でカード中央吸着
 * - IntersectionObserver で自然スクロール時のアクティブカード検出
 * - キーボード: Space/Enter=flip, ↑/↓=prev/next, Ctrl/Metaキーは素通し
 * - feedback loop 防止: IO が起因の activeIndex 変化ではスクロールしない
 */

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
  /** 各カード要素への ref 配列 (consumer が ref={el => { itemRefs.current[idx] = el }} で使う) */
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

  // IO が起因の更新かどうかを追跡する（feedback loop 防止）
  const ioTriggeredRef = useRef(false);
  // プログラマティックスクロール中フラグ（IO をスキップするため）
  const pendingScrollRef = useRef(false);
  // activeIndex の最新値を ref でも保持（stale closure 回避）
  const activeIndexRef = useRef(activeIndex);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // ── scrollToIndex ──────────────────────────────────────────────────────
  const scrollToIndex = useCallback(
    (idx: number, behavior: ScrollBehavior = "smooth") => {
      const el = itemRefs.current[idx];
      if (!el) return;
      pendingScrollRef.current = true;
      el.scrollIntoView({ behavior, block: "center" });
      // スクロールアニメーション完了後にフラグを解除（smooth は ~600ms 想定）
      setTimeout(() => {
        pendingScrollRef.current = false;
      }, 700);
    },
    [],
  );

  // ── goNext / goPrev ──────────────────────────────────────────────────
  const goNext = useCallback(() => {
    const next = Math.min(activeIndexRef.current + 1, count - 1);
    if (next === activeIndexRef.current) return;
    onActiveIndexChange(next);
    scrollToIndex(next);
  }, [count, onActiveIndexChange, scrollToIndex]);

  const goPrev = useCallback(() => {
    const prev = Math.max(activeIndexRef.current - 1, 0);
    if (prev === activeIndexRef.current) return;
    onActiveIndexChange(prev);
    scrollToIndex(prev);
  }, [onActiveIndexChange, scrollToIndex]);

  // ── 外部から activeIndex が変化したときスクロール ─────────────────────
  // IO 起因の変化はスキップ（カードはすでに見えている）
  useEffect(() => {
    if (ioTriggeredRef.current) {
      ioTriggeredRef.current = false;
      return;
    }
    scrollToIndex(activeIndex, "smooth");
  }, [activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 初回マウント: activeIndex の位置に即時スクロール ─────────────────
  useEffect(() => {
    // rAF で DOM がレンダリングされた後に実行
    const id = requestAnimationFrame(() => {
      scrollToIndex(activeIndex, "instant");
    });
    return () => cancelAnimationFrame(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── IntersectionObserver: 自然スクロールでアクティブ検出 ───────────────
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // 現在 intersection している要素のセット
    const intersectingSet = new Set<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        // intersection セットを更新
        for (const entry of entries) {
          if (entry.isIntersecting) intersectingSet.add(entry.target);
          else intersectingSet.delete(entry.target);
        }

        // プログラマティックスクロール中は無視
        if (pendingScrollRef.current) return;

        // コンテナ中心に最も近いカードを探す
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 2;

        let minDist = Infinity;
        let nearestIdx = -1;

        for (const el of intersectingSet) {
          const rect = el.getBoundingClientRect();
          const elCenter = (rect.top + rect.bottom) / 2;
          const dist = Math.abs(elCenter - containerCenter);
          const idx = itemRefs.current.indexOf(el as HTMLElement);
          if (idx !== -1 && dist < minDist) {
            minDist = dist;
            nearestIdx = idx;
          }
        }

        if (nearestIdx !== -1 && nearestIdx !== activeIndexRef.current) {
          ioTriggeredRef.current = true;
          onActiveIndexChange(nearestIdx);
        }
      },
      {
        root: container,
        // コンテナの上下 25% を除いた中央 50% 帯でのみ検出
        rootMargin: "-25% 0px -25% 0px",
        threshold: 0,
      },
    );

    const els = itemRefs.current.filter(Boolean) as HTMLElement[];
    els.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [count, scrollContainerRef, onActiveIndexChange]); // count 変化で再セットアップ

  // ── キーボードリスナー ─────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 入力中の要素では何もしない
      if (isTypingTarget(e.target)) return;
      // Ctrl / Cmd コンボはブラウザデフォルトに任せる
      if (e.ctrlKey || e.metaKey) return;

      switch (e.key) {
        case " ":
          if (e.shiftKey) return; // Shift+Space は素通し
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
  }, [onFlip, goNext, goPrev]);

  return { itemRefs, scrollToIndex, goNext, goPrev };
}
