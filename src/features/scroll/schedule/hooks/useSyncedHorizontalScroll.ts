import { useEffect, type RefObject } from "react";

type Params = {
  primaryRef: RefObject<HTMLElement | null>;
  syncedRefs: Array<RefObject<HTMLElement | null> | undefined | null>;
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

export const useSyncedHorizontalScroll = ({
  primaryRef,
  syncedRefs,
}: Params) => {
  useEffect(() => {
    const primary = primaryRef.current;

    if (!primary) return;

    const elements = getUniqueElements(primary, syncedRefs);
    let isSyncing = false;
    let resetRafId: number | null = null;

    const resetSyncing = () => {
      if (resetRafId !== null) {
        window.cancelAnimationFrame(resetRafId);
      }

      resetRafId = window.requestAnimationFrame(() => {
        isSyncing = false;
        resetRafId = null;
      });
    };

    const syncFrom = (source: HTMLElement) => {
      isSyncing = true;
      const nextScrollLeft = source.scrollLeft;

      elements.forEach((element) => {
        if (element !== source && element.scrollLeft !== nextScrollLeft) {
          element.scrollLeft = nextScrollLeft;
        }
      });

      resetSyncing();
    };

    const handleScroll = (event: Event) => {
      if (isSyncing) return;

      const source = event.currentTarget;

      if (source instanceof HTMLElement) {
        syncFrom(source);
      }
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
  }, [primaryRef, syncedRefs]);
};
