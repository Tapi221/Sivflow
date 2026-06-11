import { useEffect } from "react";
import type { RefObject } from "react";



type Params = {
  primaryRef: RefObject<HTMLElement | null>;
  syncedRefs: Array<RefObject<HTMLElement | null> | undefined | null>;
  syncKey?: string | number;
};



const getUniqueElements = (
  primary: HTMLElement,
  refs: Array<RefObject<HTMLElement | null> | undefined | null>,
) => {
  const elements = [primary];

  refs.forEach((ref) => {
    const element = ref?.current;

    if (element && !elements.includes(element)) {
      elements.push(element);
    }
  });

  return elements;
};
const useSyncedHorizontalScroll = ({ primaryRef, syncedRefs, syncKey }: Params) => {
  useEffect(() => {
    const primary = primaryRef.current;

    if (!primary) return;

    const elements = getUniqueElements(primary, syncedRefs);
    let syncingSource: HTMLElement | null = null;
    let resetRafId: number | null = null;

    const resetSyncingSource = () => {
      if (resetRafId !== null) {
        window.cancelAnimationFrame(resetRafId);
      }

      resetRafId = window.requestAnimationFrame(() => {
        syncingSource = null;
        resetRafId = null;
      });
    };

    const syncFrom = (source: HTMLElement) => {
      syncingSource = source;
      const nextScrollLeft = source.scrollLeft;

      elements.forEach((element) => {
        if (element !== source && element.scrollLeft !== nextScrollLeft) {
          element.scrollLeft = nextScrollLeft;
        }
      });

      resetSyncingSource();
    };

    const handleScroll = (event: Event) => {
      const source = event.currentTarget;

      if (!(source instanceof HTMLElement)) return;

      // プログラムで scrollLeft を合わせた要素から発火した scroll は無視しつつ、
      // 実際に操作中の source からの連続 scroll は同じフレーム内でも同期し続ける。
      if (syncingSource !== null && source !== syncingSource) return;

      syncFrom(source);
    };

    syncFrom(primary);

    elements.forEach((element) => {
      element.addEventListener("scroll", handleScroll, { passive: true });
    });

    return () => {
      elements.forEach((element) => {
        element.removeEventListener("scroll", handleScroll);
      });

      if (resetRafId !== null) {
        window.cancelAnimationFrame(resetRafId);
      }
    };
  }, [primaryRef, syncedRefs, syncKey]);
};



export { useSyncedHorizontalScroll };
