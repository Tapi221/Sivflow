import { useState, useEffect, useRef, RefObject } from "react";

/**
 * スクロール位置に応じてヘッダーの縮小状態を管理するフック
 *
 * @param compactThreshold - スクロール量がこの値を超えるとcompactになる（デフォルト: 32px）
 * @param expandThreshold - スクロール量がこの値を下回るとexpandedになる（デフォルト: 8px）
 * @param scrollElement - 監視するスクロール要素（Refオブジェクト）。未指定の場合はwindowを監視
 * @returns isCompact - ヘッダーが縮小状態かどうか
 */
export function useHeaderCompact(
  compactThreshold: number = 32,
  expandThreshold: number = 8,
  scrollElement?: RefObject<HTMLElement>,
): boolean {
  const [isCompact, setIsCompact] = useState(false);
  const rafIdRef = useRef<number | null>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const element = scrollElement?.current || window;

    const handleScroll = () => {
      // requestAnimationFrameでパフォーマンス最適化
      if (rafIdRef.current !== null) return;

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;

        // スクロール量を取得
        const scrollY = scrollElement?.current
          ? scrollElement.current.scrollTop
          : window.scrollY;

        // ヒステリシスでチラつき防止
        if (scrollY > compactThreshold && !isCompact) {
          setIsCompact(true);
        } else if (scrollY < expandThreshold && isCompact) {
          setIsCompact(false);
        }

        lastScrollY.current = scrollY;
      });
    };

    // イベントリスナーを追加
    // passive: true でスクロールパフォーマンス向上
    if (element === window) {
      window.addEventListener("scroll", handleScroll, { passive: true });
    } else if (element instanceof HTMLElement) {
      element.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      if (element === window) {
        window.removeEventListener("scroll", handleScroll);
      } else if (element instanceof HTMLElement) {
        element.removeEventListener("scroll", handleScroll);
      }
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isCompact, compactThreshold, expandThreshold, scrollElement]);

  return isCompact;
}




