import { useLayoutEffect, useRef, type RefObject } from "react";

type Params = {
  scrollerRef: RefObject<HTMLDivElement | null>;
  /** スクロール対象の総量。append/prepend どちらでも snapshot 更新に使う */
  trigger: number;
  /** 左側に追加された量。これが増えた時だけ scrollLeft を補正する */
  prependTrigger?: number;
  /** scrollerRef と横スクロール位置を揃える固定行 */
  syncedRefs?: Array<RefObject<HTMLElement | null> | undefined | null>;
  enabled?: boolean;
};

export const usePreserveScrollOnPrepend = ({
  scrollerRef,
  trigger,
  prependTrigger = trigger,
  syncedRefs = [],
  enabled = true,
}: Params) => {
  const prevSnapshotRef = useRef<{
    scrollWidth: number;
    prependTrigger: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      prevSnapshotRef.current = null;
      return;
    }

    const scroller = scrollerRef.current;
    if (!scroller) return;

    const prevSnapshot = prevSnapshotRef.current;
    if (prevSnapshot === null) {
      prevSnapshotRef.current = {
        scrollWidth: scroller.scrollWidth,
        prependTrigger,
      };
      return;
    }

    const widthDiff = scroller.scrollWidth - prevSnapshot.scrollWidth;
    const didPrepend = prependTrigger > prevSnapshot.prependTrigger;

    if (didPrepend && widthDiff > 0) {
      scroller.scrollLeft += widthDiff;

      const nextScrollLeft = scroller.scrollLeft;

      syncedRefs.forEach((ref) => {
        const syncedScroller = ref?.current;

        if (syncedScroller && syncedScroller.scrollLeft !== nextScrollLeft) {
          syncedScroller.scrollLeft = nextScrollLeft;
        }
      });
    }

    prevSnapshotRef.current = {
      scrollWidth: scroller.scrollWidth,
      prependTrigger,
    };
  }, [trigger, prependTrigger, scrollerRef, syncedRefs, enabled]);

  const reset = () => {
    prevSnapshotRef.current = null;
  };

  return { reset };
};